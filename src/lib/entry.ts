import { program } from "commander";
//import * as chalk from "chalk";
import * as finder from "find-package-json";
import { IAppConfig } from "./interfaces";

const pkg = finder(__dirname).next().value;

program.version(`version: ${pkg.version}`, "-v, --version", "output the current version.");
program.name(pkg.name);
program.option("-w, --webhook <type>", "Url to webhook application (Environment variable: GIT_CONNECTOR_WEBHOOK=<type>). Example: --webhook http://myapp:5000/webhook");
program.option("-s, --signal <type>", "Signal to application. (Environment variable: GIT_CONNECTOR_SIGNAL=<type>). Example: --signal SIGTERM", "SIGTERM");
program.option("-i, --interval <number>", "Interval checking repositories in seconds. Example: --interval 500", "600");
program.requiredOption("-e, --exec <type>", "Start command application. Example: node ./app.js");
program.requiredOption("-t, --target <type>", "Watching string/array of string git repository. Example: --target https://user:password@mygit.ru/repository.git:master:/path_repository:/path_target");

program.parse(process.argv);

const config: IAppConfig = {
    webhook: program.webhook,
    signal: program.signal,
    interval: parseInt(program.interval),
    exec: program.exec,
    target: program.target,
};











export default config;