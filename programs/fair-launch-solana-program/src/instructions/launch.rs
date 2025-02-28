use anchor_lang::{prelude::*, system_program, solana_program::sysvar::SysvarId};
use crate::constants::{ADMIN_ADDRESS, TOKEN_DECIMAL, CONFIG_SEED_IN_BYTES};
use crate::states::{Config, BondingCurve};
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    metadata::{self, mpl_token_metadata::types::DataV2, Metadata},
    token::{self, spl_token::instruction::AuthorityType, Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct Launch<'info> {
    #[account(mut, address = ADMIN_ADDRESS)]
    admin: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED_IN_BYTES],
        bump,
    )]
    global_config: Account<'info, Config>,

    #[account(
        init,
        payer = admin,
        mint::decimals = TOKEN_DECIMAL,
        mint::authority = global_config.key(),
        extensions::metadata_pointer::authority = admin,
        extensions::metadata_pointer::metadata_address = token_mint,
    )]
    token_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        payer = admin,
        space = 8 + std::mem::size_of::<BondingCurve>(),
        seeds = [token_mint.key().as_ref()],
        bump
    )]
    bonding_curve: Box<Account<'info, BondingCurve>>,

    #[account(
        init,
        payer = admin,
        associated_token::mint = token_mint,
        associated_token::authority = bonding_curve
    )]
    curve_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: initialized through CPI (token metadata program)
    #[account(mut)]
    token_metadata_account: UncheckedAccount<'info>,

    #[account(address = token::ID)]
    token_program: Program<'info, Token>,
    #[account(address = associated_token::ID)]
    associated_token_program: Program<'info, AssociatedToken>,
    #[account(address = metadata::ID)]
    metadata_program: Program<'info, Metadata>,
    #[account(address = system_program::ID)]
    system_program: Program<'info, System>,
    #[account(address = Rent::id())]
    rent: Sysvar<'info, Rent>,
}

impl<'info> Launch<'info> {
    pub fn handle(
        &mut self,

        //  metadata
        name: String,
        symbol: String,
        uri: String,

        bonding_curve_bump: u8,
    ) -> Result<()> {
        let bonding_curve = &mut self.bonding_curve;
        let global_config = &self.global_config;

        // initialising bonding curve pda
        bonding_curve.virtual_sol_reserves = 0;
        bonding_curve.token_total_supply = global_config.total_token_supply;
        bonding_curve.is_completed = false;
        // TODO: This might change to reserve tokens for influencer
        bonding_curve.virtual_token_reserves = global_config.total_token_supply;

        let signer_seeds: &[&[&[u8]]] = &[&BondingCurve::get_signer(&self.bonding_curve.to_account_info().key, &bonding_curve_bump)];

        //  minting token to bonding curve
        token::mint_to(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                token::MintTo {
                    mint: self.token_mint.to_account_info(),
                    to: self.curve_token_account.to_account_info(),
                    // TODO: may have to be changed to global_config
                    authority: self.bonding_curve.to_account_info(),
                },
                signer_seeds,
            ),
            global_config.total_token_supply,
        )?;

        //  create metadata
        metadata::create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                self.metadata_program.to_account_info(),
                metadata::CreateMetadataAccountsV3 {
                    metadata: self.token_metadata_account.to_account_info(),
                    mint: self.token_mint.to_account_info(),
                    mint_authority: self.bonding_curve.to_account_info(),
                    payer: self.admin.to_account_info(),
                    update_authority: self.bonding_curve.to_account_info(),
                    system_program: self.system_program.to_account_info(),
                    rent: self.rent.to_account_info(),
                },
                signer_seeds,
            ),
            DataV2 {
                name: name.clone(),
                symbol: symbol.clone(),
                uri: uri.clone(),
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            },
            false,
            true,
            None,
        )?;

        //  revoke mint authority
        token::set_authority(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                token::SetAuthority {
                    current_authority: self.bonding_curve.to_account_info(),
                    account_or_mint: self.token_mint.to_account_info(),
                },
                signer_seeds,
            ),
            AuthorityType::MintTokens,
            None,
        )?;

        Ok(())
    }
}