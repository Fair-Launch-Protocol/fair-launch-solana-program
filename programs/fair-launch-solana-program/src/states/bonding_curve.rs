use anchor_lang::prelude::*;

#[account]
pub struct BondingCurve {
    pub virtual_token_reserves: u64,
    pub virtual_sol_reserves: u64,
    pub token_total_supply: u64,
    pub is_completed: bool,
}
