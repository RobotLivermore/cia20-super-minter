"use client";

import React, { useCallback, useRef, useState } from "react";
import { getQueryClient } from "@sei-js/core";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { HdPath, stringToPath } from "@cosmjs/crypto";

import {
  calculateFee,
  GasPrice,
  SigningStargateClient,
} from "@cosmjs/stargate";

const getHdPath = (accountIndex = 0): HdPath => {
  const stringPath = `m/44'/118'/0'/0/${accountIndex}`;
  return stringToPath(stringPath);
};

const Minter: React.FC = () => {
  const [mnemonic, setMnemonic] = useState<string>("");
  const [isEnd, setIsEnd] = useState<boolean>(false);
  const isEndRef = useRef<boolean>(false);
  isEndRef.current = isEnd;
  const [logs, setLogs] = useState<string[]>([]);
  const [count, setCount] = useState<number>(0);

  const mintFn = useCallback(
    async (client: SigningStargateClient, address: string) => {
      try {
        const msg = {
          p: "cia-20",
          op: "mint",
          tick: "cias",
          amt: "10000",
        };
        const msg_base64 = btoa(`data:,${JSON.stringify(msg)}`);
        const fee = calculateFee(100000, "0.1utia");
        const response = await client.sendTokens(
          address,
          address,
          [{ amount: "1", denom: "utia" }],
          fee,
          msg_base64
        );
        setLogs((pre) => [
          ...pre,
          `铸造完成, txhash: ${response.transactionHash}`,
        ]);
      } catch (e) {
        // sleep 1s
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    },
    []
  );

  const walletMint = useCallback(
    async (m: string) => {
      // const wallet = await generateWalletFromMnemonic(m);
      const denom = "utia";
      const chain = "celestia";
      const rpcEndpoint = "https://public-celestia-rpc.numia.xyz";
      const gasPrice = GasPrice.fromString(`0.025${denom}`);
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(m, {
        prefix: chain,
        hdPaths: [getHdPath(0) as any],
      });

      const client = await SigningStargateClient.connectWithSigner(
        rpcEndpoint,
        wallet,
        { gasPrice: gasPrice }
      );

      const accounts = await wallet.getAccounts();
      setLogs((pre) => [...pre, `成功导入钱包: ${accounts[0].address}`]);

      const queryClient = await getQueryClient(
        "https://public-celestia-lcd.numia.xyz"
      );
      const result = await queryClient.cosmos.bank.v1beta1.balance({
        address: accounts[0].address,
        denom: "utia",
      });
      const balance = result.balance;
      setLogs((pre) => [...pre, `账户余额为:${balance.amount}`]);

      if (Number(balance.amount) === 0) {
        setLogs((pre) => [...pre, `账户余额不足`]);
        return;
      }

      try {
        // const msg = {
        //   op: "mint",
        //   amt: "10000",
        //   tick: "cias",
        //   p: "cia-20",
        // };
        // const msg_base64 = btoa(`data:,${JSON.stringify(msg)}`);
        const msg_base64 = 'ZGF0YToseyJvcCI6Im1pbnQiLCJhbXQiOjEwMDAwLCJ0aWNrIjoiY2lhcyIsInAiOiJjaWEtMjAifQ=='
        const fee = calculateFee(100000, "0.1utia");
        const response = await client.sendTokens(
          accounts[0].address,
          accounts[0].address,
          [{ amount: "1", denom: "utia" }],
          fee,
          msg_base64
        );
        setLogs((pre) => [
          ...pre,
          `铸造完成, txhash: ${response.transactionHash}`,
        ]);
        setCount((pre) => pre + 1);
      } catch (e) {
        // sleep 1s
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // const signingCosmWasmClient = await getSigningCosmWasmClient(
      //   RPC_URL_2,
      //   wallet
      // );

      while (true) {
        if (isEndRef.current) {
          setLogs((pre) => [...pre, `暂停铸造`]);
          break;
        }
        await mintFn(client, accounts[0].address);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    },
    [mintFn]
  );

  const handleMint = async () => {
    setIsEnd(false);
    setLogs((pre) => [...pre, `开始铸造`]);

    // 验证助记词
    if (!mnemonic) {
      setLogs((pre) => [...pre, `请输入助记词`]);
      return;
    }
    const walletMnemonics = mnemonic.split(",");

    for (let i = 0; i < walletMnemonics.length; i++) {
      walletMint(walletMnemonics[i]);
    }
  };

  const handleEnd = () => {
    setIsEnd(true);
    isEndRef.current = true;
  };

  return (
    <div className="flex flex-col items-center">
      <h1>Cias疯狂铸造脚本</h1>
      <p className="text-xs mt-2 text-gray-400">打到账户没钱为止</p>
      <div>
        <textarea
          className="mt-6 border border-black rounded-xl w-[400px] px-4 py-6 resize-none h-[220px]"
          placeholder="请输入助记词，比如：jazz bench loan chronic ready pelican travel charge lunar pear detect couch。当有多的账号的时候，用,分割，比如:jazz bench loan chronic ready pelican travel charge lunar pear detect couch,black clay figure average spoil insane hire typical surge still brown object"
          value={mnemonic}
          onChange={(e) => setMnemonic(e.target.value)}
        />
      </div>
      <div className="flex w-[400px] justify-center space-x-6 mt-4">
        <button
          className="border border-black px-4 py-2 rounded-full"
          onClick={handleMint}
        >
          开始铸造
        </button>
        <button
          className="border border-black px-4 py-2 rounded-full"
          onClick={handleEnd}
        >
          暂停
        </button>
      </div>

      <span className="mt-6 w-[400px] text-left">{`日志(本次已铸造+${count})`}</span>
      <div className="px-4 py-2 whitespace-pre border border-black w-[400px] h-[400px] overflow-auto">
        {logs.join("\n")}
      </div>
    </div>
  );
};

export default Minter;
