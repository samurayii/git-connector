import * as fs from "fs";
import * as chalk from "chalk";
import { resolve, dirname } from "path";
import { sync } from "rimraf";
import { EventEmitter } from "events";
import { execSync } from "child_process";
import * as crypto from "crypto";

type TTarget = {
    [key: string]: {
        target: string
        destination: string
    }
}

type TKeys = {
    [key: string]: string
}

export class Watcher extends EventEmitter {

    private readonly _repository_folder: string
    private readonly _hash_folder: string
    private _id_interval: ReturnType<typeof setTimeout>
    
    constructor (
        private readonly _repository: string,
        private readonly _branch: string,
        private readonly _tmp_folder: string,
        private readonly _targets: TTarget,
        private readonly _keys: TKeys = {}
    ) {

        super();

        if (fs.existsSync(this._tmp_folder)) {
            sync(this._tmp_folder);
        }

        this._repository_folder = resolve(this._tmp_folder, "repository");
        this._hash_folder = resolve(this._tmp_folder, "hash");

        fs.mkdirSync(this._tmp_folder);
        fs.mkdirSync(this._hash_folder);

        const git_command = `git clone --single-branch --branch ${this._branch} --depth 1 ${this._repository} ${this._repository_folder}`;

        try {
            execSync(git_command, {stdio:[]});
            console.log(`Repository ${this._repository.replace(/\/\/.*:.*@/gi, "//")} is synced`);
        } catch (error) {
            console.error(chalk.red(`Error syncing repository ${this._repository.replace(/\/\/.*:.*@/gi, "//")}`));
            console.log(chalk.red(error.message));
            process.exit(1);
        }
        
        this._synchronize();

    }

    _parseKeys (body: string): string {

        for (const key_name in this._keys) {

            const key = this._keys[key_name];
            const reg = new RegExp(`<<${key_name}>>`, "gi");

            body = body.replace(reg, key);

        }

        return body;
    }

    _synchronizeFile (target: string, destination: string): boolean {

        console.log(`Scanning file ${target}`);

        const hash_full_path = resolve(this._hash_folder, `${target.replace(this._repository_folder, "").replace(/(\/|\\)/gi, "_")}.hash`);
        let data = fs.readFileSync(target).toString();
        const new_hash = crypto.createHash("md5").update(data).digest("hex");

        data = this._parseKeys(data);

        const hash_dirname = dirname(hash_full_path);
        const destination_dirname = dirname(destination);

        if (!fs.existsSync(hash_dirname)) {
            fs.mkdirSync(hash_dirname);
        }

        if (!fs.existsSync(destination_dirname)) {
            fs.mkdirSync(destination_dirname);
        }

        if (!fs.existsSync(hash_full_path)) {

            fs.writeFileSync(destination, data);
            fs.writeFileSync(hash_full_path, new_hash);

            return true;

        } else {

            const old_hash = fs.readFileSync(hash_full_path).toString();

            if (old_hash !== new_hash) {

                console.log(`New hash for file ${destination}`);

                fs.writeFileSync(destination, data);
                fs.writeFileSync(hash_full_path, new_hash);

                return true;
            }

            return false;

        }

    }

    _synchronizeDirectory (target: string, destination: string): boolean {

        let update_flag = false;

        console.log(`Scanning directory ${target}`);

        const files = fs.readdirSync(target);

        for (const file_path of files) {

            const target_full_path = resolve(target, file_path);
            const destination_full_path = resolve(destination, file_path);
            const stat = fs.statSync(target_full_path);

            if (stat.isFile()) {
                if (this._synchronizeFile(target_full_path, destination_full_path)) {
                    update_flag = true;
                }
            }

            if (stat.isDirectory()) {
                if (this._synchronizeDirectory(target_full_path, destination_full_path)) {
                    update_flag = true;
                }
            }

        }

        return update_flag;

    }

    _synchronize (): boolean {
        
        let update_flag = false;

        for (const item_name in this._targets) {

            const item = this._targets[item_name];
            const target_full_path = resolve(this._repository_folder, item.target);
            const destination_full_path = resolve(process.cwd(), item.destination);

            if (!fs.existsSync(target_full_path)) {
                console.error(chalk.red(`Error. Target ${target_full_path} not found`));
                break;
            }

            const stat = fs.statSync(target_full_path);

            if (stat.isFile()) {
                if (this._synchronizeFile(target_full_path, destination_full_path) === true) {
                    update_flag = true;
                }
            }

            if (stat.isDirectory()) {
                if (this._synchronizeDirectory(target_full_path, destination_full_path) === true) {
                    update_flag = true;
                }
            }

        }

        return update_flag;

    } 

    watch (interval: number): void {

        let repository_change_flag = false;

        this._id_interval = setTimeout( () => {

            try {

                const stdout = execSync("git pull", {
                    cwd: this._repository_folder,
                    stdio:[]
                });

                if (!/(Already up to date|Already up-to-date)/gi.test(stdout.toString())) {
                    repository_change_flag = true;
                    console.log(`Repository ${this._repository.replace(/\/\/.*:.*@/gi, "//")} has been updated. Changes accepted.`);
                }

            } catch (error) {
                repository_change_flag = false;
                console.error(chalk.red(`Git pull repository ${this._repository.replace(/\/\/.*:.*@/gi, "//")} error.`));
                console.error(chalk.red(error.message));
            }

            if (repository_change_flag === true) {

                const update_flag = this._synchronize();

                if (update_flag === true) {
                    console.log("Emit change event");
                    this.emit("update");
                }

            }         

            this.watch(interval);

        }, interval * 1000);

    }

    close (): void {
        clearTimeout(this._id_interval);
    }

}