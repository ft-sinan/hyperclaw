import chalk from 'chalk';
import gradient from 'gradient-string';
import figlet from 'figlet';
import boxen from 'boxen';
import { getTheme } from '../infra/theme';

export class Banner {
  async showNeonBanner(daemonMode = false): Promise<void> {
    console.clear();
    const t = getTheme(daemonMode);

    const icon = daemonMode ? '🩸' : '🦅';
    try {
      const title = figlet.textSync('HYPERCLAW', { font: 'ANSI Shadow' });
      const g = (gradient as any)(daemonMode ? t.daemonGradient : t.gradient);
      const lines = title.split('\n');
      const first = lines[0] ?? '';
      console.log(`\n  ${icon} ` + g(first));
      for (let i = 1; i < lines.length; i++) console.log(g('     ' + (lines[i] ?? '')));
    } catch {
      console.log(chalk.bold.red(`\n  ${icon} HYPERCLAW\n`));
    }

    const subtitle = daemonMode
      ? chalk.hex(t.daemonPrimary)('    🩸 DAEMON MODE - ALWAYS WATCHING 🩸\n')
      : t.muted('    🦅 HyperClaw Bot - AI Gateway v5.3.5 🦅\n');

    console.log(subtitle);

    const boxOpts: any = {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'round',
      borderColor: daemonMode ? t.daemonBorderColor : t.borderColor,
    };
    if (t.boxBg) boxOpts.backgroundColor = t.boxBg;

    const { ConfigManager } = await import('../config/manager');
    const { GatewayManager } = await import('../cli/gateway');
    const cfg = await (new ConfigManager()).load().catch(() => null);
    const port = cfg?.gateway?.port ?? 18789;
    const gm = new GatewayManager();
    const running = await gm.isRunning(port);
    const chList = cfg?.gateway?.enabledChannels ?? cfg?.channels ?? [];
    const chCount = Array.isArray(chList) ? chList.length : 0;
    const providerCount = cfg?.providers?.length ?? (cfg?.provider ? 1 : 0);

    const box = boxen(
      `${t.a('●')} Gateway: ${running ? t.success('✓ Running') : t.error('✗ Stopped')}  ` +
      `${t.a('●')} Providers: ${providerCount}  ` +
      `${t.a('●')} Channels: ${chCount}  ` +
      (daemonMode ? `${t.d('🩸')} DAEMON` : `${t.a('🦅')} HYPERCLAW`),
      boxOpts
    );
    console.log(box);
    console.log(t.muted('  One assistant. All your channels. 🦅\n'));
    const { maybeShowUpdateNotice } = await import('../infra/update-check');
    maybeShowUpdateNotice(daemonMode);
  }

  async showMiniBanner(): Promise<void> {
    await this.showNeonBanner(false);
  }

  async showWizardBanner(): Promise<void> {
    console.clear();
    const t = getTheme(false);
    const g = (gradient as any)(t.gradient);
    try {
      const title = figlet.textSync('HYPERCLAW', { font: 'ANSI Shadow' });
      const lines = title.split('\n');
      const first = lines[0] ?? '';
      console.log('\n  🦅 ' + g(first));
      for (let i = 1; i < lines.length; i++) console.log(g('     ' + (lines[i] ?? '')));
    } catch {
      console.log(t.bold('\n  🦅 HYPERCLAW\n'));
    }
    console.log(t.muted('    🦅 HyperClaw Bot - AI Gateway - SETUP WIZARD v5.3.45 🦅\n'));

    const boxOpts: any = {
      padding: 1,
      margin: { bottom: 1 },
      borderStyle: 'round',
      borderColor: t.borderColor,
    };
    if (t.boxBg) boxOpts.backgroundColor = t.boxBg;

    const box = boxen(
      t.a('⚡') + ' Provider - Channels - Gateway - Identity',
      boxOpts
    );
    console.log(box);
  }

  async showOsintBanner(
    daemonMode: boolean,
    profile: { mode: string; target?: string; targetType?: string; notes?: string },
    model: string,
    sessionId: string
  ): Promise<void> {
    console.clear();
    const t = getTheme(daemonMode);
    const g = (gradient as any)(daemonMode ? t.daemonGradient : t.gradient);

    const icon = daemonMode ? '🩸' : '🔍';
    try {
      const title = figlet.textSync('HYPERCLAW', { font: 'ANSI Shadow' });
      const lines = title.split('\n');
      const first = lines[0] ?? '';
      console.log(`\n  ${icon} ` + g(first));
      for (let i = 1; i < lines.length; i++) console.log(g('     ' + (lines[i] ?? '')));
    } catch {
      console.log(chalk.bold.red(`\n  ${icon} HYPERCLAW\n`));
    }

    const subtitle = daemonMode
      ? chalk.hex(t.daemonPrimary)('    🩸 HYPERCLAW OSINT · DAEMON MODE 🩸\n')
      : chalk.red('    🔍 HYPERCLAW OSINT MODE\n');
    console.log(subtitle);

    const modeColors: Record<string, string> = {
      recon: '#06b6d4', bugbounty: '#eab308', pentest: '#dc2626', footprint: '#a855f7', custom: '#ffffff',
    };
    const modeColor = modeColors[profile.mode] ?? '#ffffff';
    const boxContent =
      `${t.a('●')} Workflow: ${chalk.hex(modeColor)(profile.mode.toUpperCase())}  ` +
      `${t.a('●')} Model: ${model}  ` +
      `${t.a('●')} Session: ${sessionId}` +
      (profile.target ? `\n  ${t.a('🎯')} Target: ${profile.target} ${profile.targetType ? `(${profile.targetType})` : ''}` : '') +
      (profile.notes ? `\n  ${t.a('📝')} ${profile.notes}` : '') +
      (daemonMode ? `\n  ${chalk.hex(t.daemonPrimary)('🩸')} Daemon connected — full shell/tool access` : '\n  ⚡ Standalone — start daemon for full access');

    const boxOpts: any = {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'round',
      borderColor: daemonMode ? t.daemonBorderColor : 'red',
    };
    if (t.boxBg) boxOpts.backgroundColor = t.boxBg;

    const box = boxen(boxContent, boxOpts);
    console.log(box);
    console.log(chalk.yellow('  ⚠️  Authorized security research only. Stay within scope.'));
    console.log(t.muted('  Commands: /exit  /clear  /findings  /target <value>  /mode  /help\n'));
  }

  async showStatus(): Promise<void> {
    const t = getTheme(false);
    const { ConfigManager } = await import('../config/manager');
    const { GatewayManager } = await import('../cli/gateway');
    const cfg = await (new ConfigManager()).load();
    const gm = new GatewayManager();
    const port = cfg?.gateway?.port ?? 18789;
    const running = await gm.isRunning(port);
    const chList = cfg?.gateway?.enabledChannels ?? cfg?.channels ?? [];
    const chCount = Array.isArray(chList) ? chList.length : 0;
    console.log(t.bold('\n  HyperClaw Status\n'));
    console.log(`  Gateway: ${running ? t.success('✓ Running') : t.error('✗ Stopped')}  port ${port}`);
    console.log(`  Provider: ${t.c(cfg?.provider?.providerId ?? 'none')}`);
    console.log(`  Channels: ${t.c(String(chCount))}`);
    console.log();
  }
}
