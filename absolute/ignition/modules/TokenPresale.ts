import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("TokenPresaleModule", (m) => {
  const TokenPresale = m.contract("TokenPresale");

  return { TokenPresale };
});
