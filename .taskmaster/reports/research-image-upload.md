# Research Query: Supabase Storage image upload in Next.js App Router: bucket creation, RLS policies, server-side upload via route handler, client-side drag-and-drop, image compression before upload, signed vs public URLs. Security and UX focus.

**Detail Level:** medium
**Context Size:** 8105 characters
**Timestamp:** 2026-03-26T04:51:22.694Z

## Results

## Criação de Buckets no Supabase Storage

Para o **Task 56** (Sistema de Upload de Imagens), crie buckets específicos como `player-avatars`, `club-logos` e `tournament-banners` diretamente no Dashboard do Supabase (Storage > New Bucket). Defina-os como **públicos** para acesso via URLs públicas, essencial para perfis públicos (**Task 63**) e landing page (**Task 79**). Use nomes com hífen para organização e habilite "Public bucket" para servir imagens sem autenticação.[1][8]

```sql
-- Exemplo de buckets via SQL (opcional, via Dashboard é mais simples)
-- INSERT INTO storage.buckets (id, public) VALUES ('player-avatars', true);
```

## Políticas RLS para Storage (Segurança)

Configure **RLS (Row Level Security)** no Storage para buckets públicos com leitura irrestrita, mas upload controlado por roles. Para o projeto (moderators em **Task 76**, managers em **Task 66**):

1. No Dashboard > Storage > Policies > Add Policy:
   - **SELECT**: `true` (leitura pública para todos os perfis e rankings).
   - **INSERT/UPDATE**: `auth.role() = 'authenticated' AND (auth.uid() = metadata->>'owner_id' OR auth.jwt() ->> 'role' IN ('manager', 'moderator'))`.
   - **DELETE**: Apenas owners ou admins.

Exemplo de policy SQL para `player-avatars`:
```sql
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'player-avatars');
CREATE POLICY "Authenticated upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'player-avatars' AND auth.role() = 'authenticated');
```

Isso garante **segurança** sem expor uploads públicos, integrando com `createServerClient` já usado nos endpoints (**Task 59**, **Task 57**).[1]

## Upload Server-Side via Route Handler

Para uploads seguros em admins/moderators (**Task 76**, **Task 66**), crie `src/app/api/upload/route.ts`:

```typescript
import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { compressImage } from '@/lib/upload/compress'; // Implementar compressão

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const bucket = formData.get('bucket') as 'player-avatars' | 'club-logos' | 'tournament-banners';
  const path = formData.get('path') as string;
  
  if (!file || !bucket || !path) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  
  // Compressão antes do upload (UX: reduz latência)
  const compressedFile = await compressImage(file);
  
  const supabase = await createServerClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, compressedFile, {
      cacheControl: '3600',
      upsert: true,
      metadata: { owner_id: supabase.auth.getUser()?.data.user?.id }
    });
    
  if (error) return NextResponse.json({ error }, { status: 500 });
  
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return NextResponse.json({ publicUrl });
}
```

**Vantagem**: Server-side evita expor `service_role` key no client, ideal para **Task 56**.[1][2][8]

## Upload Client-Side com Drag-and-Drop (UX Focus)

Expanda `src/lib/upload/uploadImage.ts` (**Task 56**) para drag-and-drop com compressão:

```typescript
import { createClient } from '@/lib/supabase/client';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_SIZE = 2 * 1024 * 1024;

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      canvas.width = Math.min(img.width, 800); // Max 800px width
      canvas.height = (canvas.width / img.width) * img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(new File([blob!], file.name, { type: 'image/webp' })), 'image/webp', 0.8);
    };
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadImage(file: File, bucket: 'player-avatars' | 'club-logos' | 'tournament-banners', path: string): Promise<string | null> {
  if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_SIZE) 
    throw new Error('Arquivo inválido');
  
  const compressed = await compressImage(file);
  const supabase = createClient();
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, compressed, { cacheControl: '3600' });
    
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrl;
}
```

**Componente Drag-and-Drop** (use em roster **Task 66** ou moderação **Task 76**):
```tsx
'use client';
import { useCallback, useRef } from 'react';
import { uploadImage } from '@/lib/upload/uploadImage';

export function ImageUploader({ bucket, path }: { bucket: string; path: string; onUpload: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files;
    if (file) {
      try {
        const url = await uploadImage(file, bucket as any, path);
        onUpload(url);
      } catch (error) {
        alert('Erro no upload');
      }
    }
  }, [bucket, path]);
  
  return (
    <div 
      className="border-2 border-dashed p-8 rounded-lg hover:border-blue-400 transition"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" className="hidden" accept="image/*" />
      <p>Arraste imagem ou clique para selecionar</p>
    </div>
  );
}
```

**UX**: Compressão reduz tempo de upload em 70%, drag-and-drop melhora conversão em forms.[8]

## Signed URLs vs Public URLs (Segurança)

| Tipo | Uso no Projeto | Exemplo |
|------|----------------|---------|
| **Public URLs** | Perfis públicos (**Task 63**), landing (**Task 79**), rankings (**Task 59**) | `https://xyz.supabase.co/storage/v1/object/public/player-avatars/uuid.jpg` - Cacheável, CDN. |
| **Signed URLs** | Uploads temporários, imagens sensíveis (proofs em **Task 76**) | `supabase.storage.from('bucket').createSignedUrl(path, 3600)` - Expira em 1h, autenticação obrigatória. |

**Recomendação**: Use **public URLs** para avatars/logos (alta performance), **signed URLs** para moderação/proofs. Sempre valide `metadata` nas policies.[1]

## Integração com Tasks Pendentes

- **Task 56**: Implemente o utilitário acima + componente drag-and-drop. Teste com buckets criados.
- **Task 66/76**: Use `ImageUploader` em roster e claims (proof images).
- **Task 63/79**: Fetch `publicUrl` do campo `avatar_url` em `players`/`clubs`.
- **Próximo passo**: Adicione preview de imagem comprimida antes do upload para melhor UX.

Essa implementação garante **segurança** (RLS + server/client híbrido) e **UX otimizada** (compressão + drag-drop), alinhada ao projeto de futebol manager.
