import { spawn } from "child_process";
import { EventEmitter } from "events";
import * as chalk from "chalk";
import { resolve } from "path";
import axios from "axios";

export class Starter extends EventEmitter {

    private _app: ReturnType<typeof spawn>
    private _update_flag: boolean

    constructor (
        private readonly _name: string,
        private readonly _cwd: string,
        private readonly _command: string,
        private readonly _webhook?: string,
    ) {
        super();
        this._update_flag = false;
    }

    start (): void {

        this._update_flag = false;

        const executer = this._command.split(" ").splice(0, 1);
        const args = this._command.split(" ").splice(1, this._command.split(" ").length - 1);
        const cwd = resolve(process.cwd(), this._cwd);

        console.log(`App workdir: ${chalk.cyan(cwd)}`);
        console.log(`Spawn command: ${chalk.cyan(this._command)}`);

        this._app = spawn(`${executer}`, args, {
            cwd: cwd,
            env: process.env
        });

        this._app.stdout.on("data", (data) => {
            console.log(`[${this._name}] ${data.toString().trim()}`);
        });

        this._app.stderr.on("data", (data) => {
            console.log(chalk.red(`[${this._name}] ${data.toString().trim()}`));
        });

        this._app.on("close", (code) => {
            if (this._update_flag === true) {
                console.log("Restarting application ...");
                this.start();
            } else {
                if (code > 0) {
                    console.log(chalk.red(`Application closed with code ${code}`));
                } else {
                    console.log("Application closed");
                }
                this.emit("close");
            }
        });

        this._app.on("error", (error) => {
            console.error(`${chalk.red("[ERROR]")} Starting application error.`);
            console.error(error.message);
            process.exit(1);
        });

    }

    update (): void {

        if (typeof this._webhook === "string") {

            console.log(`Send POST request to ${chalk.gray(this._webhook)}`);

            axios.post(this._webhook).then( () => {
                console.log("POST request is completed");
            }).catch( (error) => {
                console.error(`${chalk.red("[ERROR]")} POST request`);
                console.error(error);
            });

        } else {
            console.log("Kill application");
            this._update_flag = true;
            this._app.kill();
        }

    }

    close (): void {
        this._app.kill();
    }

}