use crate::{states::Config};
use anchor_lang::prelude::*;
use crate::constants::{ADMIN_ADDRESS, CONFIG_SEED_IN_BYTES};

#[derive(Accounts)]
pub struct Configure<'info> {
    #[account(mut, address = ADMIN_ADDRESS)]
    admin: Signer<'info>,

    #[account(
        init_if_needed,
        payer = admin,
        seeds = [CONFIG_SEED_IN_BYTES],
        space = 8 + std::mem::size_of::<Config>(),
        bump,
    )]
    global_config: Account<'info, Config>,
    system_program: Program<'info, System>,
}

impl<'info> Configure<'info> {
    pub fn handle(&mut self, new_config: Config) -> Result<()> {
        self.global_config.set_inner(new_config);

        Ok(())
    }
}
