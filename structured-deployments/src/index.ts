import chalk from "chalk"
import { DepGraph } from "dependency-graph"
import { mkdir, readFile, writeFile } from "fs/promises"
import readline from "node:readline/promises"

const rl = readline.createInterface(process.stdin, process.stdout)

export type SerializableValue = string | number | boolean

export type DependentTasks<Depends extends [...any[]]> = {
    [Index in keyof Depends]: Task<any, Depends[Index]>;
}

/**
 * Object that represents some kind of action that must be done during the deploy process.
 */
export interface Task<Depends extends [...any[]], Returns extends Record<string, SerializableValue>> {
    /** Human readable name that also functions as an unique ID */
    name: string,
    /** An array of tasks that are required to have completed before this task can run. */
    dependencies: DependentTasks<Depends>
    /** The main task callback. Put deploy logic here. Receives the output of dependencies as a parameter */
    action: (args: Depends) => Promise<Returns>,
    /** Callback run at the start of every sync. If returns true will mark this task
        and all transitive dependencies as needing re-deploys. */
    force_change: () => Promise<boolean>,
    /**
     * Callback run immediately before a task's action, must return a non-negative integer.
     *  If it returns 0 the action will proceed normally. Otherwise the value will be interpreted as a
     *  timeout in ms: the action will be skipped and only considered for running again after that amount of time.
     */
    timeout_for: () => Promise<number>,
}

type TaskState = {
    dependencies: {
        name: string,
        output: Record<string, SerializableValue> | null
    }[],
    output: Record<string, SerializableValue> | null,
}
type StateFile = Record<string, TaskState>


const tasks: Record<string, Task<any, Record<string, SerializableValue>>> = {}
const dependency_graph = new DepGraph({ circular: false })

/**
 * Registers a task object. See documentation of `Task` class for more info.
 * @param task The task to register
 * @returns transparently returns the `task` parameter so you can use it as a dependency for other tasks.
 */
export function register_task_object<Depends extends [...any[]], Returns extends Record<string, SerializableValue>>(task: Task<Depends, Returns>): Task<Depends, Returns> {
    if (task.name in tasks) {
        throw Error(`Task ${task.name} already registered. Every task must have an unique name.`)
    } else {
        tasks[task.name] = task
        const dependency_names = task.dependencies.map(({ name }) => name)
        if (new Set(dependency_names).size < task.dependencies.length) {
            throw Error(`Task has duplicate dependencies`)
        }
        dependency_graph.addNode(task.name)
        task.dependencies.forEach(dependency => {
            dependency_graph.addDependency(task.name, dependency.name)
        })
        return task
    }
}

/**
 * Creates and registers a task.
 * For more control over timeout and whether to force an update, see `register_task`
 * @param name Name of task. Should be descriptive and unique. e.x. "Deploying ERC20 Token"
 * @param dependencies Array of other tasks that must complete before this task can be run.
 * Callback should return a simple object with `string` keys and values of type `string | number | boolean`.
 * @param action Callback triggered when task is run. Receives the outputs of dependency tasks
 * @returns Task object that can be used as a dependency for other tasks
 */
export function register_task<Depends extends [...any[]], Returns extends Record<string, SerializableValue>>(name: string, dependencies: DependentTasks<Depends>, action: (args: Depends) => Promise<Returns>) {
    return register_task_object({
        name,
        timeout_for: async () => 0,
        dependencies,
        force_change: async () => false,
        action
    })
}

const get_state_file = async (): Promise<StateFile> => {
    // if state file exists, parse it and return
    try {
        const state_file = await readFile("structured-deployments/state.json", { encoding: "utf8"})
        return JSON.parse(state_file)        
    } catch (err) {}
    
    // otherwise create it from registered tasks
    const state_file: StateFile = {}

    for (const name in tasks) {
        const task = tasks[name]
        const dependencies = task.dependencies.map(dep => ({
            name: dep.name,
            output: null
        }))

        state_file[name] = {
            dependencies,
            output: null 
        }
    }
    
    return state_file
}

const run_tasks = async (state_file: StateFile): Promise<StateFile> => {
    // Load state file
    
    // construct set of all tasks that need running by checking
    // 1. task has no entry in file
    // 2. should_change returns true
    // 3. task dependencies outputs dont match in file
    // 4. output is null
    //
    // if any condition matches, add that task and all dependents into set
    const needs_running = new Set<string>()
    const mark_needs_running = (name: string) => {
        needs_running.add(name)
        dependency_graph.dependantsOf(name).forEach(dependent => needs_running.add(dependent))
    }

    for (const name in tasks) {
        const task = tasks[name]
        if (name in state_file) {
            const saved_state = state_file[name]
            if (saved_state.output === null) {
                mark_needs_running(name)
                continue
            }

            const dependencies_mismatch = saved_state.dependencies.some(dependency => 
                JSON.stringify(dependency.output) !== JSON.stringify(state_file[dependency.name]?.output)
            )
            if (dependencies_mismatch) {
                mark_needs_running(name)
                continue
            }

            if (await task.force_change()) {
                mark_needs_running(name)
            }
        } else {
            state_file[name] = {
                dependencies: task.dependencies.map(dep => ({
                    name: dep.name,
                    output: null
                })),
                output: null
            }
            mark_needs_running(name)
        }
    }

    console.log(chalk.bold("Found the following completed tasks:"))
    Object.keys(tasks).filter(task => !needs_running.has(task)).forEach(task => console.log("  - " + chalk.gray(task)))
    console.log("")

    if (needs_running.size > 0) {
        console.log(chalk.bold("Will run the following tasks:"))
        needs_running.forEach(task => console.log("  + " + chalk.green(task)))
    } else {
        console.log(chalk.bold("Everything up to date -- No tasks need to be run"))        
        process.exit(0)
    }

    console.log("")
    const input = await rl.question(chalk.bold("Would you like to continue?") + " (Y/n) ")
    if (input.toLowerCase() !== "y") {
        process.exit(0)
    }
    
    // Find task that is ready to run by iterating through all tasks in set
    // and finding one that has no dependencies that need to run, skipping
    // those that are in timeout.
    // On finding a task, check is_ready, if not put it in timeout. If yes then run
    // After running then set needs_deploy to false, writing output to task_deploy_map
    // continue until task set is empty
    // save task_deploy_map to state file
    let task_chain = Promise.resolve()
    
    console.log("")
    const in_timeout: Record<string, number> = {}
    const is_running = new Set<string>()
    const cancelled = new Set<string>()
    const completed = new Set<string>()
    const failed = new Set<string>()
    while (needs_running.size > 0) {
        // Give the event loop a chance to process promises in case of a tight loop waiting
        // for something running

        await new Promise(resolve => setTimeout(resolve, 50))
        for (const name of needs_running) {
            const task = tasks[name]
            if (!(name in in_timeout) || in_timeout[name] < Date.now()) {
                const direct_dependencies = dependency_graph.directDependenciesOf(name)
                if (direct_dependencies.every(dependency => !(needs_running.has(dependency)) && !(is_running.has(dependency)))) {
                    const timeout = await task.timeout_for()
                    if (timeout > 0) {
                        in_timeout[name] = Date.now() + timeout
                    } else {
                        const dependency_values = task.dependencies.map(({ name }) => state_file[name].output)
                        // Begin task and add promise to task_chain
                        // Check to see if it has been cancelled
                        if (cancelled.has(name)) {
                            needs_running.delete(name)
                            is_running.add(name)

                            const task_resolution = task.action(dependency_values)
                                .then(async output => {
                                    state_file[name].output = output
                                    state_file[name].dependencies = task.dependencies.map(({ name }) => ({
                                        output: state_file[name].output,
                                        name
                                    }))
                                    completed.add(name)
                                })
                                .catch(async (err) => {
                                    console.log(chalk.red(`Task ${name} aborted with error: ${err}`))
                                    const to_cancel = dependency_graph.dependantsOf(name)
                                    failed.add(name)
                                    if (to_cancel.length > 0) {
                                        console.log(chalk.red("Cancelling execution of all dependant tasks: " + to_cancel.join(",")))
                                        to_cancel.forEach(name_to_cancel => {
                                            is_running.delete(name_to_cancel)
                                            cancelled.add(name_to_cancel)
                                        })
                                    }
                                })
                                .finally(() => is_running.delete(name))
                            task_chain = task_chain.then(() => task_resolution)                        
                        }
                    }
                }
            }
        }
    }

    console.log("")
    if (cancelled.size > 0) {
        console.log(chalk.bold("Tasks that never ran because of a failed dependency:"))
        completed.forEach(name => console.log("  - " + chalk.gray(name)))        
        console.log("")
    }
    
    if (completed.size > 0) {
        console.log(chalk.bold("Tasks completed successfully:"))
        completed.forEach(name => console.log("  + " + chalk.green(name)))
        console.log("")
    }

    if (failed.size > 0) {
        console.log(chalk.bold("Tasks that failed:"))
        completed.forEach(name => console.log("  x " + chalk.red(name)))        
        console.log("")
    }

    await task_chain

    return state_file
}

/**
 * Runs all tasks that need to be run according to the state file.
 */
export const sync_tasks = async () => {
    const state_file = await get_state_file()
    const outfile = await run_tasks(state_file)
    
    console.log(chalk.bold("Writing to state file."))
    try {
        await mkdir("structured-deployments")
    } catch(e) {}

    await writeFile("structured-deployments/state.json", JSON.stringify(outfile, undefined, 4))
    process.exit(0)
}