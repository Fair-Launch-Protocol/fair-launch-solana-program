use anchor_lang::{
    prelude::*,
    solana_program::{
        program::invoke,
        system_instruction::transfer,
    },
};
use anchor_spl::token;

//  transfer sol from user
pub fn sol_transfer_from_user<'info>(
    signer: &Signer<'info>,
    destination: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    let ix = transfer(signer.key, destination.key, amount);
    invoke(
        &ix,
        &[
            signer.to_account_info(),
            destination.to_account_info(),
            system_program.to_account_info(),
        ],
    )?;

    Ok(())
}

//  transfer token from PDA
pub fn token_transfer_from_pda<'info>(
    from: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    signer_seeds: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    let cpi_ctx: CpiContext<_> = CpiContext::new_with_signer(
        token_program.to_account_info(),
        token::Transfer {
            from: from.to_account_info(),
            authority: authority.to_account_info(),
            to: to.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(cpi_ctx, amount)?;

    Ok(())
}

pub fn sol_transfer_from_curve<'info>(
    bonding_curve_account: &mut AccountInfo<'info>,
    user_account: &mut AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    **bonding_curve_account
        .to_account_info()
        .try_borrow_mut_lamports()? -= amount;
    **user_account
        .to_account_info()
        .try_borrow_mut_lamports()? += amount;

    Ok(())
}

pub fn token_transfer_from_user<'info>(
    mint: &AccountInfo<'info>,
    from: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    let cpi_ctx: CpiContext<_> = CpiContext::new(
        token_program.to_account_info(),
        token::Transfer {
            from: from.to_account_info(),
            authority: authority.to_account_info(),
            to: to.to_account_info(),
        },
    );
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}