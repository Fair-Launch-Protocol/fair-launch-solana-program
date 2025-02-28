use anchor_lang::prelude::*;

#[account]
pub struct BondingCurve {
    pub virtual_token_reserves: u64,
    pub virtual_sol_reserves: u64,
    pub token_total_supply: u64,
    pub is_completed: bool,
}

impl<'info> BondingCurve {
    //  get signer for bonding curve PDA
    pub fn get_signer<'a>(mint: &'a Pubkey, bump: &'a u8) -> [&'a [u8]; 2] {
        [
            mint.as_ref(),
            std::slice::from_ref(bump),
        ]
    }
}
