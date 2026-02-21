'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function Page() {
    const supabase = useMemo(() => createClient(), []);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [listPrefix, setListPrefix] = useState('');
    const [files, setFiles] = useState<Array<{ name: string }>>([]);

    const handleLogin = async () => {
        setStatus(null);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setStatus(error.message);
            return;
        }
        setUserId(data.user?.id ?? null);
        setStatus('login ok');
    };

    const handleLogout = async () => {
        setStatus(null);
        await supabase.auth.signOut();
        setUserId(null);
        setStatus('logout ok');
    };

    const handleUpload = async () => {
        setStatus(null);
        if (!file) {
            setStatus('selecione um arquivo');
            return;
        }
        const { data: session } = await supabase.auth.getUser();
        if (!session.user) {
            setStatus('faça login antes do upload');
            return;
        }
        const path = `${session.user.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from('claims-photos').upload(path, file, {
            upsert: false,
        });
        if (error) {
            setStatus(error.message);
            return;
        }
        setStatus(`upload ok: ${path}`);
    };

    const resolvePrefix = async () => {
        const { data: session } = await supabase.auth.getUser();
        if (!session.user) return null;
        const trimmed = listPrefix.trim();
        return trimmed.length ? trimmed : session.user.id;
    };

    const handleList = async () => {
        setStatus(null);
        const prefix = await resolvePrefix();
        if (!prefix) {
            setStatus('faça login para listar');
            return;
        }
        const { data, error } = await supabase.storage.from('claims-photos').list(prefix, {
            limit: 50,
        });
        if (error) {
            setStatus(error.message);
            setFiles([]);
            return;
        }
        setFiles(data ?? []);
        setStatus(`listagem ok: ${prefix}`);
    };

    const handleDelete = async (name: string) => {
        setStatus(null);
        const prefix = await resolvePrefix();
        if (!prefix) {
            setStatus('faça login para deletar');
            return;
        }
        const path = `${prefix}/${name}`;
        const { error } = await supabase.storage.from('claims-photos').remove([path]);
        if (error) {
            setStatus(error.message);
            return;
        }
        setFiles((current) => current.filter((item) => item.name !== name));
        setStatus(`delete ok: ${path}`);
    };

    const handleDownload = async (name: string) => {
        setStatus(null);
        const prefix = await resolvePrefix();
        if (!prefix) {
            setStatus('faça login para baixar');
            return;
        }
        const path = `${prefix}/${name}`;
        const { data, error } = await supabase.storage.from('claims-photos').createSignedUrl(path, 60);
        if (error || !data?.signedUrl) {
            setStatus(error?.message ?? 'não foi possível gerar link');
            return;
        }
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
            <div className="w-full max-w-md space-y-4 bg-card border border-border rounded-xl p-6">
                <h1 className="text-xl font-semibold">Login simples</h1>
                <div className="space-y-2">
                    <input
                        className="w-full rounded-md bg-background border border-border px-3 py-2 text-sm"
                        placeholder="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                    <input
                        className="w-full rounded-md bg-background border border-border px-3 py-2 text-sm"
                        placeholder="senha"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                    <div className="flex gap-2">
                        <button
                            className="flex-1 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm"
                            onClick={handleLogin}
                        >
                            Entrar
                        </button>
                        <button
                            className="flex-1 rounded-md border border-border px-3 py-2 text-sm"
                            onClick={handleLogout}
                        >
                            Sair
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">User: {userId ?? 'não autenticado'}</p>
                    <input
                        className="w-full rounded-md bg-background border border-border px-3 py-2 text-sm"
                        type="file"
                        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                    />
                    <button
                        className="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm"
                        onClick={handleUpload}
                    >
                        Upload para claims-photos
                    </button>
                </div>

                <div className="space-y-2">
                    <input
                        className="w-full rounded-md bg-background border border-border px-3 py-2 text-sm"
                        placeholder="prefixo (userId) para listar"
                        value={listPrefix}
                        onChange={(event) => setListPrefix(event.target.value)}
                    />
                    <button
                        className="w-full rounded-md border border-border px-3 py-2 text-sm"
                        onClick={handleList}
                    >
                        Listar arquivos
                    </button>
                    {files.length ? (
                        <div className="space-y-2">
                            {files.map((item) => (
                                <div key={item.name} className="flex items-center justify-between gap-2 text-sm">
                                    <span className="truncate">{item.name}</span>
                                    <div className="flex gap-2">
                                        <button
                                            className="rounded-md border border-border px-2 py-1 text-xs"
                                            onClick={() => handleDownload(item.name)}
                                        >
                                            Baixar
                                        </button>
                                        <button
                                            className="rounded-md border border-border px-2 py-1 text-xs"
                                            onClick={() => handleDelete(item.name)}
                                        >
                                            Deletar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>

                {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
            </div>
        </div>
    );
}
