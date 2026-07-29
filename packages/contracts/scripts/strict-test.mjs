import { spawn } from "node:child_process";

const child = spawn("hardhat", ["test"], {
  env: process.env,
  stdio: ["inherit", "pipe", "pipe"],
});

let transcript = "";
for (const stream of [child.stdout, child.stderr]) {
  stream.on("data", (chunk) => {
    const text = chunk.toString();
    transcript += text;
    const destination = stream === child.stdout ? process.stdout : process.stderr;
    destination.write(chunk);
  });
}

child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.on("close", (code) => {
  const runnerReportedFailure = /(?:^|\n)Test run failed\s*(?:\n|$)/m.test(transcript)
    || /(?:^|\n)\s*[1-9][0-9]* failing(?:\s|$)/m.test(transcript);
  const runnerReportedPassingTests = /(?:^|\n)\s*[1-9][0-9]* passing(?:\s|$)/m.test(transcript);
  process.exitCode = code === 0 && !runnerReportedFailure && runnerReportedPassingTests ? 0 : 1;
});
