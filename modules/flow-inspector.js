// ==================== 流程检测器 (flow-inspector.js) ====================
// 挂载到 window.FlowInspector
// 增强版：支持断点、单步执行、步骤日志、失败导出
// 用于定位“无输出”等问题，追溯到失败步骤

window.FlowInspector = (function() {

    // 步骤记录
    const steps = [];

    // 总开关
    let enabled = true;

    // ---------- 新增：断点与单步 ----------
    let breakpoints = new Set();           
    let stepModeActive = false;            
    let onStepPauseCallback = null;        
    let onBreakpointCallback = null;       
    let lastStepLog = [];

    function registerStep(name, checkFn, onFail) {
        steps.push({ name, checkFn, onFail: onFail || null });
    }

    function run(context) {
        if (!enabled) return { passed: true, failedStep: null, errors: [] };

        context.errors = context.errors || [];
        context._stepLog = [];
        context._currentStep = 0;

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            context._currentStep = i + 1;
            try {
                const result = step.checkFn(context);
                context._stepLog.push({
                    step: step.name,
                    result: result,
                    timestamp: Date.now(),
                    passed: !!result
                });
                if (!result) {
                    const msg = `[FlowInspector] 步骤 "${step.name}" 未通过`;
                    context.errors.push(msg);
                    console.error(msg, context);
                    if (step.onFail) step.onFail(context);
                    lastStepLog = context._stepLog;
                    return {
                        passed: false,
                        failedStep: step.name,
                        errors: context.errors,
                        stepLog: context._stepLog
                    };
                }
            } catch (e) {
                const msg = `[FlowInspector] 步骤 "${step.name}" 抛异常: ${e.message}`;
                context.errors.push(msg);
                console.error(msg, e);
                if (step.onFail) step.onFail(context);
                lastStepLog = context._stepLog;
                return {
                    passed: false,
                    failedStep: step.name,
                    errors: context.errors,
                    stepLog: context._stepLog,
                    exception: e
                };
            }
        }

        lastStepLog = context._stepLog;
        return {
            passed: true,
            failedStep: null,
            errors: context.errors,
            stepLog: context._stepLog
        };
    }

    async function runStepByStep(context, options = {}) {
        if (!enabled) return { passed: true, aborted: false };

        context.errors = context.errors || [];
        context._stepLog = [];
        context._currentStep = 0;

        const breakOnSteps = new Set(options.breakOnStep || []);
        const isStepMode = options.stepMode === true;
        const onStep = options.onStep || null;
        const onBreakpoint = options.onBreakpoint || null;

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            context._currentStep = i + 1;

            let shouldWait = false;
            if (isStepMode) shouldWait = true;
            else if (breakOnSteps.has(step.name)) shouldWait = true;

            if (shouldWait) {
                let userContinue = true;
                if (typeof onBreakpoint === 'function') {
                    userContinue = await onBreakpoint(step.name, context);
                } else {
                    userContinue = confirm(`[断点] 步骤 "${step.name}" 即将执行。\n点击“确定”继续，取消则中止。`);
                }
                if (!userContinue) {
                    return {
                        passed: false,
                        failedStep: step.name,
                        errors: ['用户中断执行'],
                        aborted: true,
                        stepLog: context._stepLog
                    };
                }
            }

            let stepResult;
            try {
                stepResult = step.checkFn(context);
                context._stepLog.push({
                    step: step.name,
                    result: stepResult,
                    timestamp: Date.now(),
                    passed: !!stepResult
                });

                if (!stepResult) {
                    const msg = `[FlowInspector] 步骤 "${step.name}" 未通过`;
                    context.errors.push(msg);
                    console.error(msg, context);
                    if (step.onFail) step.onFail(context);
                    lastStepLog = context._stepLog;
                    return {
                        passed: false,
                        failedStep: step.name,
                        errors: context.errors,
                        stepLog: context._stepLog,
                        aborted: false
                    };
                }
            } catch (e) {
                const msg = `[FlowInspector] 步骤 "${step.name}" 抛异常: ${e.message}`;
                context.errors.push(msg);
                console.error(msg, e);
                if (step.onFail) step.onFail(context);
                lastStepLog = context._stepLog;
                return {
                    passed: false,
                    failedStep: step.name,
                    errors: context.errors,
                    stepLog: context._stepLog,
                    exception: e,
                    aborted: false
                };
            }

            if (typeof onStep === 'function') {
                const goOn = await onStep(step.name, stepResult, context);
                if (goOn === false) {
                    return {
                        passed: false,
                        failedStep: step.name,
                        errors: ['用户在步骤后终止'],
                        aborted: true,
                        stepLog: context._stepLog
                    };
                }
            }
        }

        lastStepLog = context._stepLog;
        return {
            passed: true,
            errors: context.errors,
            stepLog: context._stepLog,
            aborted: false
        };
    }

    function setBreakpoint(stepNames, active = true) {
        const names = Array.isArray(stepNames) ? stepNames : [stepNames];
        for (const name of names) {
            if (active) breakpoints.add(name);
            else breakpoints.delete(name);
        }
    }

    function clearBreakpoints() {
        breakpoints.clear();
    }

    function getBreakpoints() {
        return Array.from(breakpoints);
    }

    function exportLastStepLog() {
        return JSON.parse(JSON.stringify(lastStepLog));
    }

    function clearLogCache() {
        lastStepLog = [];
    }

    function setEnabled(flag) {
        enabled = flag;
    }

    function clearSteps() {
        steps.length = 0;
    }

    function getStepNames() {
        return steps.map(s => s.name);
    }

    return {
        registerStep,
        run,
        runStepByStep,
        setBreakpoint,
        clearBreakpoints,
        getBreakpoints,
        exportLastStepLog,
        clearLogCache,
        setEnabled,
        clearSteps,
        getStepNames
    };
})();