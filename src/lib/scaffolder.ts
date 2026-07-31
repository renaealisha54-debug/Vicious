
import { DissectedFile } from './types';

export function generateScaffold(framework: string, deps: string[]): DissectedFile[] {
  const scaffold: DissectedFile[] = [];

  const packageJson = {
    name: "vicious-archi-project",
    version: "0.1.0",
    private: true,
    dependencies: deps.reduce((acc, dep) => ({ ...acc, [dep]: "latest" }), {})
  };

  scaffold.push({
    path: 'package.json',
    content: JSON.stringify(packageJson, null, 2),
    language: 'json'
  });

  scaffold.push({
    path: 'tsconfig.json',
    content: JSON.stringify({
      compilerOptions: {
        target: "es5",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "node",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
      exclude: ["node_modules"]
    }, null, 2),
    language: 'json'
  });

  return scaffold;
}
