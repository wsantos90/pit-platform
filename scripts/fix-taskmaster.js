/**
 * fix-taskmaster.js
 * 
 * Postinstall script que corrige um bug no task-master-ai v0.43.x onde
 * o contador de subtasks exibe 0/0 no `task-master list`.
 * 
 * Causa: tmCore.tasks.list() não inclui subtasks por padrão (includeSubtasks: false),
 * então o dashboard de progresso não consegue contá-las.
 * 
 * Fix: força includeSubtasks: true no método getTasks da classe Pn (comando list).
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'node_modules', 'task-master-ai', 'dist');

// Localiza o arquivo correto (o nome inclui um hash que pode mudar entre versões)
const files = fs.existsSync(distDir)
    ? fs.readdirSync(distDir).filter(f => f.startsWith('dependency-manager') && f.endsWith('.js'))
    : [];

if (files.length === 0) {
    console.log('⚠  task-master-ai dist not found — skipping fix.');
    process.exit(0);
}

let fixed = 0;

for (const file of files) {
    const filePath = path.join(distDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Bug: includeSubtasks só é true quando --with-subtasks é passado
    const bugPattern = 'includeSubtasks:e.withSubtasks}),{blocksMap';
    const fixedPattern = 'includeSubtasks:!0}),{blocksMap';

    if (content.includes(bugPattern)) {
        content = content.replace(bugPattern, fixedPattern);
        fs.writeFileSync(filePath, content);
        console.log(`✓ task-master subtask fix aplicado em: ${file}`);
        fixed++;
    } else if (content.includes(fixedPattern)) {
        console.log(`✓ task-master subtask fix já aplicado em: ${file} (sem alterações)`);
    } else {
        console.log(`⚠  Padrão não encontrado em ${file} — versão diferente? Fix ignorado.`);
    }
}

if (fixed > 0) {
    console.log(`\n✅ ${fixed} arquivo(s) corrigido(s). O contador de subtasks funcionará corretamente.`);
}
