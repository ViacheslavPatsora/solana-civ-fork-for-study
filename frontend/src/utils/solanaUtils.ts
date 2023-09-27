import { Connection, clusterApiUrl } from "@solana/web3.js";
import { Buffer } from "buffer";
import { weightedRandomTile } from "../components/Terrain";
import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Solciv } from "../context/idl";

const { REACT_APP_RPC: RPC } = process.env;

const connection = new Connection(RPC || clusterApiUrl("devnet"), "confirmed");

export const getMap = async (provider: AnchorProvider | undefined, program: Program<Solciv> | undefined) => {
  if (!provider || !program) {
    return null;
  }
  const [gameKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("GAME"), provider.publicKey.toBuffer()],
    program.programId
  );

  const [playerKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("PLAYER"), gameKey.toBuffer(), provider.publicKey.toBuffer()],
    program.programId
  );

  let gameAccount;
  try {
    // @ts-ignore
    gameAccount = await program.account.game.fetch(gameKey);
  } catch (error) {
    console.log("Error while fetching game account: ", error);
  }
  console.log("[solanaUtils] getMap()", gameAccount);
  return gameAccount ? gameAccount.map : null;
};

export const getGame = async (provider: AnchorProvider | undefined, program: Program<Solciv> | undefined) => {
  if (!provider || !program) {
    return null;
  }
  const [gameKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("GAME"), provider.publicKey.toBuffer()],
    program.programId
  );

  try {
    // @ts-ignore
    const gameAccount = await program.account.game.fetch(gameKey);
    console.log("[solanaUtils] getGame()", gameAccount);
    return gameAccount;
  } catch (error) {
    console.log("Error while fetching game account: ", error);
  }
  return null;
};

export const getPlayer = async (provider: AnchorProvider | undefined, program: Program<Solciv> | undefined) => {
  if (!provider || !program) {
    return null;
  }
  const [gameKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("GAME"), provider.publicKey.toBuffer()],
    program.programId
  );

  const [playerKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("PLAYER"), gameKey.toBuffer(), provider.publicKey.toBuffer()],
    program.programId
  );

  let playerAccount;
  try {
    // @ts-ignore
    playerAccount = await program.account.player.fetch(playerKey);
  } catch (error) {
    console.log("Error while fetching player account: ", error);
  }
  console.log("[solanaUtils] getPlayer()", playerAccount);
  const balances = playerAccount ? playerAccount.resources : {};
  const units = playerAccount ? playerAccount.units : [];
  const cities = playerAccount ? playerAccount.cities : [];
  const tiles = playerAccount ? playerAccount.tiles : [];

  try {
    const balance = await connection.getBalance(provider.publicKey);
    balances.sol = balance ? Number(balance) / 1e9 : 0;
  } catch (error) {
    console.error("Failed to fetch balance", error);
  }
  return { balances, units, cities, tiles };
};

export const getNpcs = async (provider: AnchorProvider | undefined, program: Program<Solciv> | undefined) => {
  if (!provider || !program) {
    return null;
  }
  const [gameKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("GAME"), provider.publicKey.toBuffer()],
    program.programId
  );

  const [npcKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("NPC"), gameKey.toBuffer()],
    program.programId
  );

  let npcAccount;
  try {
    // @ts-ignore
    npcAccount = await program.account.npc.fetch(npcKey);
  } catch (error) {
    console.log("Error while fetching npc account: ", error);
  }
  console.log("[solanaUtils] getNpcs()", npcAccount);
  const units = npcAccount ? npcAccount.units : [];
  const cities = npcAccount ? npcAccount.cities : [];

  return { units, cities };
};

export const initializeGame = async (provider: AnchorProvider, program: Program<Solciv>) => {
  const [gameKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("GAME"), provider.publicKey.toBuffer()],
    program.programId
  );
  console.log("Game account address", gameKey.toString());

  const [playerKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("PLAYER"), gameKey.toBuffer(), provider.publicKey.toBuffer()],
    program.programId
  );
  console.log("Player account address", playerKey.toString());

  const [npcKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("NPC"), gameKey.toBuffer()],
    program.programId
  );
  console.log("NPC account address", npcKey.toString());

  let gameAccount;
  try {
    // @ts-ignore
    gameAccount = await program.account.game.fetch(gameKey);
  } catch (error) {
    console.log("Error while fetching game account: ", error);
  }
  if (gameAccount && gameAccount.player.toBase58() === provider.publicKey.toBase58()) {
    console.log("Existing game account", gameAccount);
  } else {
    const randomMap = Array.from({ length: 400 }, () => weightedRandomTile());

    const accounts = {
      game: gameKey,
      player: provider.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    };
    const tx = await program.methods.initializeGame(randomMap).accounts(accounts).rpc();
    console.log("Transaction signature", tx);
    // wait for transaction to be confirmed
    await connection.confirmTransaction(tx);
    // @ts-ignore
    const account = await program.account.game.fetch(gameKey);
    console.log("Created game account", account);
  }
  let playerAccount;
  try {
    // @ts-ignore
    playerAccount = await program.account.player.fetch(playerKey);
  } catch (error) {
    console.log("Error while fetching player account: ", error);
  }
  if (playerAccount && playerAccount.player.toBase58() === provider.publicKey.toBase58()) {
    console.log("Existing player account", playerAccount);
  } else {
    const accounts = {
      game: gameKey,
      playerAccount: playerKey,
      player: provider.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    };
    const tx = await program.methods.initializePlayer().accounts(accounts).rpc();
    console.log("Transaction signature", tx);

    // wait for transaction to be confirmed
    await connection.confirmTransaction(tx);

    // @ts-ignore
    const account = await program.account.player.fetch(playerKey);
    console.log("Created player account", account);
  }
  let npcAccount;
  try {
    // @ts-ignore
    npcAccount = await program.account.npc.fetch(npcKey);
  } catch (error) {
    console.log("Error while fetching npc account: ", error);
  }
  if (npcAccount) {
    console.log("Existing npc account", npcAccount);
  } else {
    const accounts = {
      game: gameKey,
      npcAccount: npcKey,
      player: provider.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    };
    const tx = await program.methods.initializeNpc().accounts(accounts).rpc();
    console.log("Transaction signature", tx);

    // wait for transaction to be confirmed
    await connection.confirmTransaction(tx);

    // @ts-ignore
    const account = await program.account.npc.fetch(npcKey);
    console.log("Created npc account", account);
  }
};

export const foundCity = async (provider: AnchorProvider, program: Program<Solciv>, unit: any) => {
  const [gameKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("GAME"), provider.publicKey.toBuffer()],
    program.programId
  );

  const [playerKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("PLAYER"), gameKey.toBuffer(), provider.publicKey.toBuffer()],
    program.programId
  );

  const accounts = {
    game: gameKey,
    player: provider.publicKey,
    playerAccount: playerKey,
    systemProgram: anchor.web3.SystemProgram.programId,
  };
  try {
    const tx = await program.methods.foundCity(unit.x, unit.y, unit.unitId).accounts(accounts).rpc();
    console.log(`Found a city TX: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
  } catch (error) {
    console.log("Error while founding city: ", error);
    return error;
  }
  return true;
};

export const upgradeLandPlot = async (provider: AnchorProvider, program: Program<Solciv>, unit: any) => {
  const [gameKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("GAME"), provider.publicKey.toBuffer()],
    program.programId
  );

  const [playerKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("PLAYER"), gameKey.toBuffer(), provider.publicKey.toBuffer()],
    program.programId
  );

  const accounts = {
    game: gameKey,
    player: provider.publicKey,
    playerAccount: playerKey,
  };
  try {
    const tx = await program.methods.upgradeTile(unit.x, unit.y, unit.unitId).accounts(accounts).rpc();
    console.log(`Upgrade land plot TX: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
  } catch (error) {
    console.log("Error while upgrading land: ", error);
    return error;
  }
  return true;
};
