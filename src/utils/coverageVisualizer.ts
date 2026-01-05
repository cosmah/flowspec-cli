/**
 * FlowSpec CLI - Coverage Visualizer
 * Generates HTML reports showing test coverage before/after FlowSpec
 */

import * as fs from 'fs';
import * as path from 'path';
import { TestDebtCounter } from './testDebt';

interface CoverageSnapshot {
  timestamp: number;
  totalComponents: number;
  testedComponents: number;
  coveragePercentage: number;
  untestedFiles: string[];
}

export class CoverageVisualizer {
  private projectRoot: string;
  private snapshotsPath: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.snapshotsPath = path.join(projectRoot, '.flowspec', 'coverage-snapshots.json');
  }

  /**
   * Take a snapshot of current coverage
   */
  async takeSnapshot(): Promise<CoverageSnapshot> {
    const debtCounter = new TestDebtCounter(this.projectRoot);
    const report = await debtCounter.calculateTestDebt();

    const snapshot: CoverageSnapshot = {
      timestamp: Date.now(),
      totalComponents: report.totalComponents,
      testedComponents: report.testedComponents,
      coveragePercentage: report.coveragePercentage,
      untestedFiles: report.untestedFiles.map(f => f.relativePath)
    };

    // Save snapshot
    const snapshots = this.loadSnapshots();
    snapshots.push(snapshot);
    this.saveSnapshots(snapshots);

    return snapshot;
  }

  /**
   * Generate HTML coverage report
   */
  async generateReport(): Promise<string> {
    const snapshots = this.loadSnapshots();
    const debtCounter = new TestDebtCounter(this.projectRoot);
    const currentReport = await debtCounter.calculateTestDebt();

    if (snapshots.length === 0) {
      // Take initial snapshot
      await this.takeSnapshot();
      return this.generateReport();
    }

    const firstSnapshot = snapshots[0];
    const lastSnapshot = snapshots[snapshots.length - 1];
    const improvement = currentReport.coveragePercentage - firstSnapshot.coveragePercentage;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FlowSpec Coverage Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }
        .content {
            padding: 2rem;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 1.5rem;
            border-left: 4px solid #667eea;
        }
        .stat-card h3 {
            color: #666;
            font-size: 0.9rem;
            text-transform: uppercase;
            margin-bottom: 0.5rem;
        }
        .stat-card .value {
            font-size: 2.5rem;
            font-weight: bold;
            color: #333;
        }
        .stat-card .change {
            font-size: 0.9rem;
            margin-top: 0.5rem;
            color: ${improvement >= 0 ? '#10b981' : '#ef4444'};
        }
        .progress-bar {
            background: #e5e7eb;
            border-radius: 999px;
            height: 30px;
            overflow: hidden;
            margin: 1rem 0;
            position: relative;
        }
        .progress-fill {
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            height: 100%;
            transition: width 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 0.9rem;
        }
        .timeline {
            margin-top: 2rem;
        }
        .timeline-item {
            padding: 1rem;
            border-left: 3px solid #667eea;
            margin-left: 1rem;
            margin-bottom: 1rem;
            background: #f8f9fa;
            border-radius: 0 8px 8px 0;
        }
        .timeline-item .date {
            color: #666;
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
        }
        .timeline-item .coverage {
            font-size: 1.2rem;
            font-weight: bold;
            color: #333;
        }
        .untested-list {
            margin-top: 2rem;
        }
        .untested-list h2 {
            margin-bottom: 1rem;
            color: #333;
        }
        .untested-item {
            padding: 0.75rem;
            background: #fef3c7;
            border-left: 3px solid #f59e0b;
            margin-bottom: 0.5rem;
            border-radius: 0 4px 4px 0;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.9rem;
        }
        .footer {
            text-align: center;
            padding: 2rem;
            color: #666;
            background: #f8f9fa;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 FlowSpec Coverage Report</h1>
            <p>Generated ${new Date().toLocaleString()}</p>
        </div>
        <div class="content">
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Current Coverage</h3>
                    <div class="value">${currentReport.coveragePercentage}%</div>
                    <div class="change">
                        ${improvement >= 0 ? '↑' : '↓'} ${Math.abs(improvement)}% since start
                    </div>
                </div>
                <div class="stat-card">
                    <h3>Total Components</h3>
                    <div class="value">${currentReport.totalComponents}</div>
                    <div class="change">
                        ${currentReport.testedComponents} tested
                    </div>
                </div>
                <div class="stat-card">
                    <h3>Untested</h3>
                    <div class="value">${currentReport.untestedComponents}</div>
                    <div class="change">
                        ${currentReport.estimatedTimeToCoverage < 60 
                          ? `${currentReport.estimatedTimeToCoverage}s` 
                          : `${Math.floor(currentReport.estimatedTimeToCoverage / 60)}m`} to 100%
                    </div>
                </div>
            </div>

            <div class="progress-bar">
                <div class="progress-fill" style="width: ${currentReport.coveragePercentage}%">
                    ${currentReport.coveragePercentage}%
                </div>
            </div>

            ${snapshots.length > 1 ? `
            <div class="timeline">
                <h2>Coverage Timeline</h2>
                ${snapshots.map(snapshot => `
                    <div class="timeline-item">
                        <div class="date">${new Date(snapshot.timestamp).toLocaleString()}</div>
                        <div class="coverage">${snapshot.coveragePercentage}% coverage</div>
                        <div style="color: #666; font-size: 0.9rem; margin-top: 0.25rem;">
                            ${snapshot.testedComponents}/${snapshot.totalComponents} components tested
                        </div>
                    </div>
                `).join('')}
            </div>
            ` : ''}

            ${currentReport.untestedFiles.length > 0 ? `
            <div class="untested-list">
                <h2>⚠️ Untested Components</h2>
                ${currentReport.untestedFiles.map(file => `
                    <div class="untested-item">${file}</div>
                `).join('')}
            </div>
            ` : `
            <div style="text-align: center; padding: 2rem; background: #d1fae5; border-radius: 8px; margin-top: 2rem;">
                <h2 style="color: #059669; margin-bottom: 0.5rem;">🎉 100% Coverage!</h2>
                <p style="color: #047857;">All components have tests. Great work!</p>
            </div>
            `}
        </div>
        <div class="footer">
            <p>Generated by FlowSpec - AI-Powered Test Generation</p>
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Save report to HTML file
   */
  async saveReport(outputPath?: string): Promise<string> {
    const html = await this.generateReport();
    const reportPath = outputPath || path.join(this.projectRoot, '.flowspec', 'coverage-report.html');
    
    // Ensure directory exists
    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(reportPath, html, 'utf-8');
    return reportPath;
  }

  /**
   * Load snapshots from disk
   */
  private loadSnapshots(): CoverageSnapshot[] {
    if (!fs.existsSync(this.snapshotsPath)) {
      return [];
    }

    try {
      const data = JSON.parse(fs.readFileSync(this.snapshotsPath, 'utf-8'));
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Save snapshots to disk
   */
  private saveSnapshots(snapshots: CoverageSnapshot[]): void {
    try {
      const dir = path.dirname(this.snapshotsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.snapshotsPath, JSON.stringify(snapshots, null, 2), 'utf-8');
    } catch (error) {
      // Silently fail
    }
  }
}

