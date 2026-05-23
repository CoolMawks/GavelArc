require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";
module.exports = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    arcTestnet: { url: "https://rpc.testnet.arc.network", chainId: 5042002, accounts: [PRIVATE_KEY] }
  }
};
