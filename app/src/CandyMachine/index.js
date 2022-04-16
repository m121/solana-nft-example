import React, { useEffect, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import { MintLayout, TOKEN_PROGRAM_ID, Token } from '@solana/spl-token';
import { sendTransactions } from './connection';
import './CandyMachine.css';
import CountdownTimer from '../CountdownTimer';
import {
  candyMachineProgram,
  TOKEN_METADATA_PROGRAM_ID,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  getAtaForMint,
  getNetworkExpire,
  getNetworkToken,
  CIVIC
} from './helpers';
import { programs } from "@metaplex/js";

const { SystemProgram } = web3;
const opts = {
  preflightCommitment: 'processed',
};

const {
  metadata: { Metadata, MetadataProgram },
} = programs;

const MAX_NAME_LENGTH = 32;
const MAX_URI_LENGTH = 200;
const MAX_SYMBOL_LENGTH = 10;
const MAX_CREATOR_LEN = 32 + 1 + 1;

const CandyMachine = ({ walletAddress }) => {
  // Add state property inside your component like this
  const [candyMachine, setCandyMachine] = useState(null);
  const [mints, setMints] = useState([]);
  const [isLoadingMints, setIsLoadingMints] = useState(false);

  

  const getCandyMachineCreator = async (candyMachine) => {
    const candyMachineID = new PublicKey(candyMachine);
    return await web3.PublicKey.findProgramAddress(
        [Buffer.from('candy_machine'), candyMachineID.toBuffer()],
        candyMachineProgram,
    );
  };

  const getMetadata = async (mint) => {
    return (
      await PublicKey.findProgramAddress(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )
    )[0];
  };

  const getMasterEdition = async (mint) => {
    return (
      await PublicKey.findProgramAddress(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
          Buffer.from('edition'),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )
    )[0];
  };
  
  const createAssociatedTokenAccountInstruction = (
    associatedTokenAddress,
    payer,
    walletAddress,
    splTokenMintAddress
  ) => {
    const keys = [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
      { pubkey: walletAddress, isSigner: false, isWritable: false },
      { pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
      {
        pubkey: web3.SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      {
        pubkey: web3.SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false,
      },
    ];
    return new web3.TransactionInstruction({
      keys,
      programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
      data: Buffer.from([]),
    });
  };

  const mintToken = async () => {
    const mint = web3.Keypair.generate();

const userTokenAccountAddress = (
  await getAtaForMint(mint.publicKey, walletAddress.publicKey)
)[0];
  
const userPayingAccountAddress = candyMachine.state.tokenMint
? (await getAtaForMint(candyMachine.state.tokenMint, walletAddress.publicKey))[0]
: walletAddress.publicKey;

const candyMachineAddress = candyMachine.id;
const remainingAccounts = [];
const signers = [mint];
    const cleanupInstructions = [];
    const instructions = [
      web3.SystemProgram.createAccount({
        fromPubkey: walletAddress.publicKey,
        newAccountPubkey: mint.publicKey,
        space: MintLayout.span,
        lamports:
          await candyMachine.program.provider.connection.getMinimumBalanceForRentExemption(
            MintLayout.span,
          ),
        programId: TOKEN_PROGRAM_ID,
      }),
      Token.createInitMintInstruction(
        TOKEN_PROGRAM_ID,
        mint.publicKey,
        0,
        walletAddress.publicKey,
        walletAddress.publicKey,
      ),
      createAssociatedTokenAccountInstruction(
        userTokenAccountAddress,
        walletAddress.publicKey,
        walletAddress.publicKey,
        mint.publicKey,
      ),
      Token.createMintToInstruction(
        TOKEN_PROGRAM_ID,
        mint.publicKey,
        userTokenAccountAddress,
        walletAddress.publicKey,
        [],
        1,
      ),
    ];
  
    if (candyMachine.state.gatekeeper) {
    }
    if (candyMachine.state.whitelistMintSettings) {
      
    }
  
    if (candyMachine.state.tokenMint) {
      
    }
    const metadataAddress = await getMetadata(mint.publicKey);
const masterEdition = await getMasterEdition(mint.publicKey);
  
const [candyMachineCreator, creatorBump] = await getCandyMachineCreator(
  candyMachineAddress,
);
  
instructions.push(
  await candyMachine.program.instruction.mintNft(creatorBump, {
    accounts: {
      candyMachine: candyMachineAddress,
      candyMachineCreator,
      payer: walletAddress.publicKey,
      wallet: candyMachine.state.treasury,
      mint: mint.publicKey,
      metadata: metadataAddress,
      masterEdition,
      mintAuthority: walletAddress.publicKey,
      updateAuthority: walletAddress.publicKey,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: web3.SYSVAR_RENT_PUBKEY,
      clock: web3.SYSVAR_CLOCK_PUBKEY,
      recentBlockhashes: web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
      instructionSysvarAccount: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    },
    remainingAccounts:
      remainingAccounts.length > 0 ? remainingAccounts : undefined,
  }),
);
  
try {
  return (
    await sendTransactions(
      candyMachine.program.provider.connection,
      candyMachine.program.provider.wallet,
      [instructions, cleanupInstructions],
      [signers, []],
    )
  ).txs.map(t => t.txid);
} catch (e) {
  console.log(e);
}
    return [];
  };

  useEffect(() => {
    setMints([]);
    getCandyMachineState();
  }, []);	

  const getProvider = () => {
    const rpcHost = process.env.REACT_APP_SOLANA_RPC_HOST;
    // Create a new connection object
    const connection = new Connection(rpcHost);
    
    // Create a new Solana provider object
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    );
  
    return provider;
  };

  // Declare getCandyMachineState as an async method
const getCandyMachineState = async () => {
  const provider = getProvider();
  const idl = await Program.fetchIdl(candyMachineProgram, provider);
  const program = new Program(idl, candyMachineProgram, provider);
  const candyMachine = await program.account.candyMachine.fetch(
    process.env.REACT_APP_CANDY_MACHINE_ID
  );
  
  const itemsAvailable = candyMachine.data.itemsAvailable.toNumber();
  const itemsRedeemed = candyMachine.itemsRedeemed.toNumber();
  const itemsRemaining = itemsAvailable - itemsRedeemed;
  const goLiveData = candyMachine.data.goLiveDate.toNumber();

  const goLiveDateTimeString = `${new Date(
    goLiveData * 1000
  ).toLocaleDateString()} @ ${new Date(
    goLiveData * 1000
  ).toLocaleTimeString()}`;

  // Add this data to your state to render
  setCandyMachine({
    id: process.env.REACT_APP_CANDY_MACHINE_ID,
    program,
    state: {
      itemsAvailable,
      itemsRedeemed,
      itemsRemaining,
      goLiveData,
      goLiveDateTimeString,
      isSoldOut: itemsRemaining === 0,
      isActive:
        (candyMachine.data.presale ||
          candyMachine.data.goLiveDate.toNumber() < new Date().getTime() / 1000) &&
        (candyMachine.endSettings
          ? candyMachine.endSettings.endSettingType.date
            ? candyMachine.endSettings.number.toNumber() > new Date().getTime() / 1000
            : itemsRedeemed < candyMachine.endSettings.number.toNumber()
          : true),
      isPresale: candyMachine.data.presale,
      goLiveDate: candyMachine.data.goLiveDate,
      treasury: candyMachine.wallet,
      tokenMint: candyMachine.tokenMint,
      gatekeeper: candyMachine.data.gatekeeper,
      endSettings: candyMachine.data.endSettings,
      whitelistMintSettings: candyMachine.data.whitelistMintSettings,
      hiddenSettings: candyMachine.data.hiddenSettings,
      price: candyMachine.data.price,
    },
  });

  console.log({
    itemsAvailable,
    itemsRedeemed,
    itemsRemaining,
    goLiveData,
    goLiveDateTimeString,
  });

  const data = await fetchHashTable(
    process.env.REACT_APP_CANDY_MACHINE_ID,
    true
  );

  if (data.length !== 0) {
    for (const mint of data) {
      // Get URI
      const response = await fetch(mint.data.uri);
      const parse = await response.json();
      console.log(parse);
      console.log("Past Minted NFT", mint);

      const nftData = {
        image: parse.image,
        name: parse.name,
        position: parse.attributes[1].value,
        jerseyNumber: parse.attributes[2].value,
        team: parse.attributes[3].value,
        mint_url: `https://explorer.solana.com/address/${mint.mint}?cluster=${process.env.REACT_APP_SOLANA_NETWORK}`,
      };

      // Get image URI
      if (!mints.find((mint) => mint === parse.image)) {
        setMints((prevState) => [...prevState, nftData]);
      }
    }
  }

  setIsLoadingMints(false);

};

// Actions
const fetchHashTable = async (hash, metadataEnabled) => {
  const connection = new web3.Connection(
    process.env.REACT_APP_SOLANA_RPC_HOST
  );

  const metadataAccounts = await MetadataProgram.getProgramAccounts(
    connection,
    {
      filters: [
        {
          memcmp: {
            offset:
              1 +
              32 +
              32 +
              4 +
              MAX_NAME_LENGTH +
              4 +
              MAX_URI_LENGTH +
              4 +
              MAX_SYMBOL_LENGTH +
              2 +
              1 +
              4 +
              0 * MAX_CREATOR_LEN,
            bytes: hash,
          },
        },
      ],
    }
  );

  const mintHashes = [];

  for (let index = 0; index < metadataAccounts.length; index++) {
    const account = metadataAccounts[index];
    const accountInfo = await connection.getParsedAccountInfo(account.pubkey);
    const metadata = new Metadata(hash.toString(), accountInfo.value);
    if (metadataEnabled) mintHashes.push(metadata.data);
    else mintHashes.push(metadata.data.mint);
  }

  return mintHashes;
};


// Create render function
const renderDropTimer = () => {
  // Get the current date and dropDate in a JavaScript Date object
  const currentDate = new Date();
  const dropDate = new Date(candyMachine.state.goLiveData * 1000);

  // If currentDate is before dropDate, render our Countdown component
  if (currentDate < dropDate) {
    console.log('Before drop date!');
    // Don't forget to pass over your dropDate!
    return <CountdownTimer dropDate={dropDate} />;
  }

  // Else let's just return the current drop date
  return <p>{`Drop Date: ${candyMachine.state.goLiveDateTimeString}`}</p>;
};

const renderMintedItems = () => (
  <div className="gif-container">
    <p className="sub-text">Minted Captains ✨</p>
    <div className="gif-grid">
      {mints.map((mint) => (
        <div className="gif-item" key={mint.name}>
          <img src={mint.image} alt={`Minted NFT ${mint.name}`} />
          <p className="mint-text">
            #{mint.jerseyNumber} - {mint.name}
          </p>
          <p className="mint-text">{mint.team}</p>
          <a href={mint.mint_url} target="_blank" rel="noreferrer">
            NFT Explore Link
          </a>
        </div>
      ))}
    </div>
  </div>
);


  


return (
  candyMachine && candyMachine.state && (
    <div className="machine-container">
      {renderDropTimer()}
      <p>{`Items Minted: ${candyMachine.state.itemsRedeemed} / ${candyMachine.state.itemsAvailable}`}</p>
        {/* Check to see if these properties are equal! */}
        {candyMachine.state.itemsRedeemed === candyMachine.state.itemsAvailable ? (
          <p className="sub-text">Sold Out 🙊</p>
        ) : (
          <button
            className="cta-button mint-button "
            onClick={mintToken}
          >
            Mint NFT
          </button>
        )}
        {mints.length > 0 && renderMintedItems()}
    </div>
  )
);
};

export default CandyMachine;
