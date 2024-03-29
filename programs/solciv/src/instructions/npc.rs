use crate::consts::*;
use crate::state::*;
use anchor_lang::prelude::*;

pub fn initialize_npc(
    ctx: Context<InitializeNpc>,
    npc_position_1: TileCoordinate,
    npc_position_2: TileCoordinate,
) -> Result<()> {
    ctx.accounts.npc_account.game = ctx.accounts.game.key();
    ctx.accounts.npc_account.player = ctx.accounts.player.key();
    ctx.accounts.npc_account.next_city_id = 0;
    ctx.accounts.npc_account.next_unit_id = 0;
    ctx.accounts.game.npc = ctx.accounts.npc_account.key();

    let npc_one = NewCityParams {
        city_id: 0,
        player: ctx.accounts.npc_account.player,
        game: ctx.accounts.game.key(),
        x: npc_position_1.x,
        y: npc_position_1.y,
        name: "Barbarian Village".to_string(),
        health: 1000,
        controlled_tiles: vec![TileCoordinate {
            x: npc_position_1.x,
            y: npc_position_1.y,
        }],
    };
    let npc_two = NewCityParams {
        city_id: 1,
        player: ctx.accounts.npc_account.player,
        game: ctx.accounts.game.key(),
        x: npc_position_2.x,
        y: npc_position_2.y,
        name: "Barbarian Village".to_string(),
        health: 1000,
        controlled_tiles: vec![TileCoordinate {
            x: npc_position_2.x,
            y: npc_position_2.y,
        }],
    };
    ctx.accounts.npc_account.cities = vec![City::new(npc_one), City::new(npc_two)];

    // Initialize units for the NPC.
    ctx.accounts.npc_account.units = vec![Unit::new(
        0,
        ctx.accounts.npc_account.key(),
        ctx.accounts.game.key(),
        UnitType::Warrior,
        npc_position_1.x + 1,
        npc_position_1.y,
    )];
    ctx.accounts.npc_account.next_unit_id = 1;
    ctx.accounts.npc_account.next_city_id = 2;

    msg!("NPC created!");

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeNpc<'info> {
    pub game: Box<Account<'info, Game>>,

    #[account(
        init,
        seeds=[
            b"NPC",
            game.key().as_ref(),
        ],
        bump,
        payer = player,
        space = std::mem::size_of::<Npc>() +
            4 + (20 * MAX_CITIES as usize) +
            std::mem::size_of::<Unit>() * MAX_UNITS as usize +
            std::mem::size_of::<City>() * MAX_CITIES as usize + 8)
    ]
    pub npc_account: Box<Account<'info, Npc>>,

    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}
