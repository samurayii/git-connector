import { spawn } from "child_process";
import { EventEmitter } from "events";
import * as chalk from "chalk";
import axios from "axios";

export class Starter extends EventEmitter {

    private _app: ReturnType<typeof spawn>
    private _update_flag: boolean

    constructor (
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

        console.log(`Spawn command "${this._command}"`);

        this._app = spawn(`${executer}`, args, {
            cwd: this._cwd
        });

        this._app.stdout.on("data", (data) => {
            console.log(`[app] ${data.toString().trim()}`);
        });

        this._app.stderr.on("data", (data) => {
            console.log(chalk.red(`[app] ${data.toString().trim()}`));
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
            console.error(chalk.red("Starting application error."));
            console.error(chalk.red(error.message));
            process.exit(1);
        });

    }

    update (): void {

        if (typeof this._webhook === "string") {

            console.log(`Send POST request to ${this._webhook}`);

            axios.post(this._webhook).then( () => {
                console.log("POST request is completed");
            }).catch( (error) => {
                console.error("Error POST request");
                console.error(chalk.red(error));
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