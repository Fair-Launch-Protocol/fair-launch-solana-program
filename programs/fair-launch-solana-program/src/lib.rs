mod instructions;
mod states;
mod errors;
mod constants;

use crate::instructions::*;
use crate::states::*;

use anchor_lang::prelude::*;

declare_id!("9skK6yTzZgPmkYwwdwsVw9GzFkjHd9pVUnKJWsGYpv7m");

#[program]
pub mod fair_launch_solana_program {
    use super::*;

    pub fn configure(ctx: Context<Configure>, new_config: Config) -> Result<()> {
        ctx.accounts.handle(new_config)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
