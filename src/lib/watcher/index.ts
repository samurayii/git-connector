import * as fs from "fs";
import * as chalk from "chalk";
import { resolve } from "path";
import { sync } from "rimraf";
import { EventEmitter } from "events";
import { execSync } from "child_process";

type TTarget = {
    [key: string]: {
        target: string
        destination: string
    }
}

export class Watcher extends EventEmitter {

    private readonly _repository_folder: string
    private readonly _hash_folder: string
    private _id_interval: ReturnType<typeof setTimeout>
    
    constructor (
        private readonly _repository: string,
        private readonly _branch: string,
        private readonly _tmp_folder: string,
        private readonly _targets: TTarget
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
        
        //this._synchronize();

    }
/*
    _synchronize (): boolean {
        
        let update_flag = false;

        for (const item of this._targets) {

            const target_full_path = resolve(this._repository_folder, item.target);
            const destination_full_path = resolve(process.cwd(), item.destination);
            const hash_full_path = resolve(this._hash_folder, `${item.destination.replace(/(\/|\\)/gi, "_")}.hash`);

            if (!fs.existsSync(target_full_path)) {
                console.error(chalk.red(`Error. Target ${target_full_path} not found`));
                break;
            }

            if (fs.existsSync(destination_full_path)) {

            }


        }





        return update_flag;

    } 
*/
    watch (interval: number): void {

        let repository_change_flag = false;

        this._id_interval = setTimeout( () => {

            try {

                const stdout = execSync("git pull", {
                    cwd: this._repository_folder
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
/*
                const update_flag = this._synchronize();

                if (update_flag === true) {
                    this.emit("update");
                }
*/
            }         

            this.watch(interval);

        }, interval * 1000);

    }

    close (): void {
        clearTimeout(this._id_interval);
    }

}