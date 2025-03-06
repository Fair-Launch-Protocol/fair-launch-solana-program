mod instructions;
mod states;
mod errors;
mod constants;
mod utils;
mod events;

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

    pub fn launch(ctx: Context<Launch>, name: String, symbol: String, uri: String) -> Result<()> {
        ctx.accounts.handle(name, symbol, uri, ctx.bumps.global_config)
    }

    pub fn swap(ctx: Context<Swap>, amount_in: u64, is_buy: bool) -> Result<()> {
        ctx.accounts.handle(amount_in, is_buy, ctx.bumps.bonding_curve)
    }
}
