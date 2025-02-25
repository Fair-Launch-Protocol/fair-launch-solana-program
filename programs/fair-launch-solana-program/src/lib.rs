use anchor_lang::prelude::*;

declare_id!("9skK6yTzZgPmkYwwdwsVw9GzFkjHd9pVUnKJWsGYpv7m");

#[program]
pub mod fair_launch_solana_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
