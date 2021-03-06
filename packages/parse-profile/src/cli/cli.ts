import { HierarchyNode } from 'd3-hierarchy';
import * as fs from 'fs';
import { ICpuProfileNode, Trace } from '../trace';
import { exportHierarchy } from '../trace/export';
import { aggregate, categorizeAggregations, collapseCallFrames, verifyMethods } from './aggregator';
import { Archive } from './archive_trace';
import { ModuleMatcher } from './module_matcher';
import { report as reporter } from './reporter';
import {
  addRemainingModules,
  computeMinMax,
  formatCategories,
  methodsFromCategories,
} from './utils';

export interface UI {
  file: string;
  archive: string;
  methods: string[];
  event?: string;
  report?: string;
  verbose?: boolean;
}

export default class CommandLine {
  archive: Archive;
  filePath: string;

  constructor(private ui: UI) {
    let { file, archive: archivePath } = this.ui;
    let defaultProfilePath = `${process.cwd()}/trace.json`;
    let defaultArchivePath = `${process.cwd()}/trace.archive`;

    if (file === undefined && !fs.existsSync(file) && !fs.existsSync(defaultProfilePath)) {
      throw new Error(`Error: Must pass a path to the trace file 💣`);
    }

    if (archivePath === undefined && fs.existsSync(defaultArchivePath) === false) {
      throw new Error(`Error: Must pass a path to the archive file 💣`);
    }

    this.archive = JSON.parse(fs.readFileSync(archivePath || defaultArchivePath, 'utf8'));
    this.filePath = file || defaultProfilePath;
  }

  run() {
    let { archive } = this;
    let { report, methods } = this.ui;
    let trace = this.loadTrace();
    let profile = this.cpuProfile(trace)!;

    this.export(profile.hierarchy, trace);

    let modMatcher = new ModuleMatcher(profile.hierarchy, archive);

    let categories = formatCategories(report, methods);
    let allMethods = methodsFromCategories(categories);
    addRemainingModules(allMethods, categories, modMatcher);
    verifyMethods(allMethods);

    let aggregations = aggregate(profile.hierarchy, allMethods, archive, modMatcher);
    let collapsed = collapseCallFrames(aggregations);
    let categorized = categorizeAggregations(collapsed, categories);
    reporter(categorized);
  }

  private loadTrace() {
    let { filePath } = this;
    let traceEvents = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let trace = new Trace();
    trace.addEvents(traceEvents.traceEvents);
    trace.buildModel();
    return trace;
  }

  private cpuProfile(trace: Trace) {
    let { event } = this.ui;
    let { min, max } = computeMinMax(trace, 'navigationStart', event!);
    return trace.cpuProfile(min, max);
  }

  private export(hierarchy: HierarchyNode<ICpuProfileNode>, trace: Trace) {
    const { filePath } = this;
    const rawTraceData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    exportHierarchy(rawTraceData, hierarchy, trace, filePath);
  }
}
