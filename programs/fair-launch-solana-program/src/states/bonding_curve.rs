use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use crate::errors::CustomError;
use crate::events::TradeEvent;
use crate::utils::{sol_transfer_from_user, token_transfer_from_pda};

#[account]
pub struct BondingCurve {
    pub virtual_token_reserves: u64,
    pub virtual_sol_reserves: u64,
    pub is_completed: bool,
}

impl<'info> BondingCurve {
    pub fn get_signer<'a>(mint: &'a Pubkey, bump: &'a u8) -> [&'a [u8]; 2] {
        [
            mint.as_ref(),
            std::slice::from_ref(bump),
        ]
    }

    pub fn update_reserves(&mut self, reserve_lamport: u64, reserve_token: u64) -> Result<bool> {
        self.virtual_sol_reserves = reserve_lamport;
        self.virtual_token_reserves = reserve_token;

        Ok(false)
    }

    //  calculate amount out and fee lamports
    fn calc_amount_out(
        &mut self,
        amount_in: u64,
        is_buy: bool,
        fee_percent: f64,
    ) -> Result<(u64, u64, u64)> {
        let fee_lamports = (amount_in as f64 * fee_percent / 100.0) as u64;
        let amount_in_after_fee = amount_in - fee_lamports;

        let x = self.virtual_token_reserves as f64;
        let y = self.virtual_sol_reserves as f64;
        let k = x * y;

        let amount_out: f64 = if is_buy {
            // Buying: Compute tokens to receive for `amount_in_after_fee` SOL
            x - (k / (y + amount_in_after_fee as f64))
        } else {
            // Selling: Compute SOL to receive for `amount_in_after_fee` tokens
            y - (k / (x + amount_in_after_fee as f64))
        };

        // Ensure non-negative values and convert to u64
        let amount_out = amount_out.max(0.0) as u64;

        Ok((amount_out, fee_lamports, amount_in_after_fee))
    }

    pub fn buy(
        &mut self,
        token_mint: &Account<'info, Mint>, //  token mint address
        lamports_needed_to_complete_curve: u64, //  bonding curve limit
        user: &Signer<'info>, //  user address

        bonding_curve_pda: &mut AccountInfo<'info>, //  bonding curve PDA
        fee_recipient: &mut AccountInfo<'info>, //  team wallet address to get fee

        user_ata: &mut AccountInfo<'info>, //  associated toke accounts for user
        curve_ata: &mut AccountInfo<'info>, //  associated toke accounts for curve

        amount_in: u64, //  sol amount to pay
        min_amount_out: u64, //  minimum amount out
        fee_percent: f64, //  buy fee

        curve_bump: u8, // bump for signer

        system_program: &AccountInfo<'info>, //  system program
        token_program: &AccountInfo<'info>,  //  token program
    ) -> Result<bool> {

        let (amount_out, fee_lamports, amount_in_after_fees) =
            self.calc_amount_out(amount_in, true, fee_percent)?;

        //  check min amount out
        require!(
            amount_out >= min_amount_out,
            CustomError::ReturnAmountTooSmall
        );

        //  transfer fee to team wallet
        sol_transfer_from_user(&user, fee_recipient, system_program, fee_lamports)?;
        //  transfer adjusted amount to curve
        sol_transfer_from_user(&user, bonding_curve_pda, system_program, amount_in_after_fees)?;
        //  transfer token from PDA to user
        token_transfer_from_pda(
            curve_ata,
            bonding_curve_pda,
            user_ata,
            token_program,
            &[&BondingCurve::get_signer(&token_mint.key(), &curve_bump)],
            amount_out,
        )?;

        //  calculate new reserves
        let new_token_reserves = self
            .virtual_token_reserves
            .checked_sub(amount_out)
            .ok_or(CustomError::OverflowOrUnderflowOccurred)?;

        let new_sol_reserves = self
            .virtual_sol_reserves
            .checked_add(amount_in_after_fees)
            .ok_or(CustomError::OverflowOrUnderflowOccurred)?;

        //  update reserves on the curve
        self.update_reserves(new_sol_reserves, new_token_reserves)?;

        emit!(TradeEvent {
            trader: user.key(),
            asset: token_mint.key(),
            amount_in,
            amount_out,
            is_buy: true,
        });

        //  return true if the curve reached the limit
        if new_sol_reserves >= lamports_needed_to_complete_curve {
            self.is_completed = true;
            return Ok(true);
        }

        //  return false, curve is not reached the limit
        Ok(false)
    }
}
