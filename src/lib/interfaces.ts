export interface IAppConfig {
    webhook?: string
    interval: number
    exec: string
    target: string[]
    update: boolean
    tmp: string
    cwd: string
    keys: string[]
    scan_hidden: boolean
    app: string
}