// Compressione nativa (CompressionStream, Safari ≥ 16.4).

/** Comprime in gzip una sequenza di pezzi di testo senza mai costruire la stringa intera. */
export async function gzipChunks(chunks: AsyncIterable<string> | Iterable<string>): Promise<ArrayBuffer> {
  const cs = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  const output = new Response(cs.readable).arrayBuffer()
  const encoder = new TextEncoder()
  for await (const chunk of chunks) {
    await writer.write(encoder.encode(chunk))
  }
  await writer.close()
  return output
}

export async function gunzipToText(data: ArrayBuffer): Promise<string> {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}
