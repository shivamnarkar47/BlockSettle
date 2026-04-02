const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts...");
  
  const CashToken = await hre.ethers.getContractFactory("CashToken");
  const cashToken = await CashToken.deploy();
  await cashToken.waitForDeployment();
  const cashTokenAddress = await cashToken.getAddress();
  console.log("CashToken deployed to:", cashTokenAddress);
  
  const SecurityToken = await hre.ethers.getContractFactory("SecurityToken");
  const securityToken = await SecurityToken.deploy();
  await securityToken.waitForDeployment();
  const securityTokenAddress = await securityToken.getAddress();
  console.log("SecurityToken deployed to:", securityTokenAddress);
  
  const Settlement = await hre.ethers.getContractFactory("Settlement");
  const settlement = await Settlement.deploy();
  await settlement.waitForDeployment();
  const settlementAddress = await settlement.getAddress();
  console.log("Settlement deployed to:", settlementAddress);
  
  await settlement.setTokens(cashTokenAddress, securityTokenAddress);
  console.log("Tokens configured in Settlement contract");
  
  const fs = require("fs");
  const config = {
    cashToken: cashTokenAddress,
    securityToken: securityTokenAddress,
    settlement: settlementAddress,
    network: "localhost",
    chainId: 31337
  };
  
  fs.writeFileSync("./deployments.json", JSON.stringify(config, null, 2));
  console.log("Deployment addresses saved to deployments.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });