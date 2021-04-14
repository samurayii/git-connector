import { Command } from "commander";
import * as chalk from "chalk";
import { execSync } from "child_process";
import { IAppConfig } from "./interfaces";
import * as fs from "fs";
import * as path from "path";

type TPackage = {
    [key: string]: unknown
}

const findPkg = (): TPackage => {

    const cwd_pkg_full_path = path.resolve(process.cwd(), "package.json");
    const dirname_pkg_full_path = path.resolve(__dirname, "package.json");
    const app_pkg_full_path = path.resolve(path.dirname(process.argv[1]), "package.json");

    if (fs.existsSync(cwd_pkg_full_path) === true) {
        return <TPackage>JSON.parse(fs.readFileSync(cwd_pkg_full_path).toString());
    }
    if (fs.existsSync(dirname_pkg_full_path) === true) {
        return <TPackage>JSON.parse(fs.readFileSync(dirname_pkg_full_path).toString());
    }
    if (fs.existsSync(app_pkg_full_path) === true) {
        return <TPackage>JSON.parse(fs.readFileSync(app_pkg_full_path).toString());
    }
};

const program = new Command();
const pkg = findPkg();

if (pkg === undefined) {
    console.error(chalk.red("[ERROR] package.json not found"));
    process.exit(1);
}

program.version(`version: ${pkg.version}`, "-v, --version", "output the current version.");
program.name(<string>pkg.name);
program.option("-w, --webhook <type>", "Url to webhook application (Environment variable: GIT_CONNECTOR_WEBHOOK=<type>). Example: --webhook http://myapp:5000/webhook");
program.option("-i, --interval <number>", "Interval checking repositories in seconds (Environment variable: GIT_CONNECTOR_INTERVAL=<number>). Example: --interval 500", "600");
program.option("-k, --keys [letters...]", "Path to files with keys (Environment variable: GIT_CONNECTOR_KEYS=<string[]>). Example: --keys /keys.json");
program.option("-e, --exec <type>", "Start command application (Environment variable: GIT_CONNECTOR_EXEC=<type>). Example: node ./app.js");
program.option("-t, --target [letters...]", "Watching string/array of string git repository (Environment variable: GIT_CONNECTOR_TARGET=<string[]>). Example: --target https://user:password@mygit.ru/repository.git:master:/path_repository:/path_target");
program.option("-u, --update", "Flag for watch target update (Environment variable: GIT_CONNECTOR_UPDATE=(true|false)).", false);
program.option("-tmp, --tmp <type>", "Path to tmp folder (Environment variable: GIT_CONNECTOR_TMP=<type>). Example: --tmp /my_tmp", "tmp");
program.option("-c, --cwd <type>", "Path to workdir (Environment variable: GIT_CONNECTOR_CWD=<type>). Example: --cwd /my_cwd", `${process.cwd()}`);
program.option("-sh, --scan_hidden", "Scanning hidden files and folders (Environment variable: GIT_CONNECTOR_SCAN_HIDDEN=(true|false)).", false);
program.option("-a, --app <type>", "App name (Environment variable: GIT_CONNECTOR_APP=<type>).", "app");

program.parse(process.argv);

const options = program.opts();

const config: IAppConfig = {
    webhook: options.webhook,
    interval: parseInt(options.interval),
    exec: options.exec,
    target: options.target,
    update: options.update,
    tmp: options.tmp,
    cwd: options.cwd,
    keys: options.keys,
    scan_hidden: options.scan_hidden,
    app: options.app
};

if (process.env["GIT_CONNECTOR_WEBHOOK"] !== undefined) {
    config.webhook = process.env["GIT_CONNECTOR_WEBHOOK"].trim();
}
if (process.env["GIT_CONNECTOR_INTERVAL"] !== undefined) {
    config.interval = parseInt(process.env["GIT_CONNECTOR_INTERVAL"].trim());
}
if (process.env["GIT_CONNECTOR_EXEC"] !== undefined) {
    config.exec = process.env["GIT_CONNECTOR_EXEC"].trim();
}
if (process.env["GIT_CONNECTOR_APP"] !== undefined) {
    config.app = process.env["GIT_CONNECTOR_APP"].trim();
}
if (process.env["GIT_CONNECTOR_TARGET"] !== undefined) {
    config.target = JSON.parse(process.env["GIT_CONNECTOR_TARGET"].trim());
}
if (process.env["GIT_CONNECTOR_KEYS"] !== undefined) {
    config.keys = JSON.parse(process.env["GIT_CONNECTOR_KEYS"].trim());
}
if (process.env["GIT_CONNECTOR_UPDATE"] !== undefined) {
    if (process.env["GIT_CONNECTOR_UPDATE"].trim() === "true") {
        config.update = true;
    } else {
        config.update = false;
    }
}
if (process.env["GIT_CONNECTOR_TMP"] !== undefined) {
    config.tmp = process.env["GIT_CONNECTOR_TMP"].trim();
}
if (process.env["GIT_CONNECTOR_CWD"] !== undefined) {
    config.cwd = process.env["GIT_CONNECTOR_CWD"].trim();
}
if (process.env["GIT_CONNECTOR_SCAN_HIDDEN"] !== undefined) {
    if (process.env["GIT_CONNECTOR_SCAN_HIDDEN"].trim() === "true") {
        config.scan_hidden = true;
    } else {
        config.scan_hidden = false;
    }
}

if (config.webhook !== undefined) {
    config.webhook = config.webhook.trim();
    if (!/^http(s|)\:\/\/(.*\:.*@|)[a-z0-9]{1}[-a-z0-9.]{0,128}(\:[0-9]{1,5}|)(\/|)(.*|)$/gi.test(config.webhook)) {
        console.error(chalk.red("Error. Webhook key not correspond regexp /^http(s|)\\:\\/\\/(.*\\:.*@|)[a-z0-9]{1}[-a-z0-9.]{0,128}(\\:[0-9]{1,5}|)(\\/|)(.*|)$/gi"));
        process.exit(1);
    }
}

if (config.interval <= 0) {
    console.error(chalk.red("Error. Interval key must be more than 0"));
    process.exit(1);
}

if (config.exec === undefined) {
    console.error(`${chalk.red("[ERROR]")} Key --exec or -e is empty`);
    process.exit(1);
}

if (config.tmp.length === undefined) {
    console.error(`${chalk.red("[ERROR]")} Key --tmp or -tmp is empty`);
    process.exit(1);
}

if (config.cwd.length === undefined) {
    console.error(`${chalk.red("[ERROR]")} Key --cwd or -c is empty`);
    process.exit(1);
}

config.exec = config.exec.trim();
config.tmp = config.tmp.trim();
config.cwd = config.cwd.trim();

if (config.exec.length <= 0) {
    console.error(`${chalk.red("[ERROR]")} Key --exec or -e is empty`);
    process.exit(1);
}

if (config.tmp.length <= 0) {
    console.error(`${chalk.red("[ERROR]")} Key --tmp or -tmp is empty`);
    process.exit(1);
}

if (config.cwd.length <= 0) {
    console.error(`${chalk.red("[ERROR]")} Key --cwd or -c is empty`);
    process.exit(1);
}

if (!fs.existsSync(config.cwd)) {
    console.error(`${chalk.red("[ERROR]")} Cwd folder ${config.cwd} not found`);
    process.exit(1);
}

if (Array.isArray(config.target)) {

    for (let item of config.target) {
        item = item.trim();
        if (!/^http(s|)\:\/\/(.*\:.*@|)[a-z0-9]{1}[-a-z0-9.]{0,128}(\:[0-9]{1,5}|)\/.*\.git\:[-a-z0-9._]*\:\/[-a-z0-9._\/]*\:[-a-z0-9._\/]*$/gi.test(item)) {
            console.error(chalk.red("Error. Target item not correspond regexp /^http(s|)\\:\\/\\/(.*\\:.*@|)[a-z0-9]{1}[-a-z0-9.]{0,128}(\\:[0-9]{1,5}|)\\/.*\\.git\\:[-a-z0-9._]*\\:\\/[-a-z0-9_\\/]*\\:[-a-z0-9_\\/]*$/gi"));
            process.exit(1);
        }
    }

} else {
    config.target = [];
}

if (!Array.isArray(config.keys)) {
    config.keys = [];
}

try {
    execSync("git --version");
} catch (error) {
    console.error(chalk.red("Git exec error."));
    console.error(`${chalk.red("[ERROR]")} Git exec error. ${error.message}`);
    process.exit(1);
}

export default config;