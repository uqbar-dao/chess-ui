import forge from 'node-forge'

function getCookie(name: string) {
  const cookies = document.cookie.split(';')
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim()
    if (cookie.startsWith(name)) {
      return cookie.substring(name.length + 1)
    }
  }
}

function stringifyAndEncode(data: any) {
  const json = JSON.stringify(data)
  const encoder = new TextEncoder();
  const bytes = encoder.encode(json);
  return bytes
}

function blobToUint8Array(blob: Blob): Promise<Uint8Array> { // eslint-disable-line
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject
    reader.onload = function (event: any) {
      const arrayBuffer = event.target.result;
      const uint8Array = new Uint8Array(arrayBuffer);
      resolve(uint8Array)
    };
    reader.readAsArrayBuffer(blob);
  })
}

export default class UqbarEncryptorApi {
  // 1. Generate a keypair
  nodeId: string;
  processId: string;
  _secret: string | undefined;
  _cipher: forge.cipher.BlockCipher | undefined; // eslint-disable-line
  _decipher: forge.cipher.BlockCipher | undefined; // eslint-disable-line
  _ws: WebSocket;

  constructor({
    nodeId,
    processId,
    uri = 'ws://' + window.location.host,
    onMessage = () => null,
    onOpen = () => null,
    onClose = () => null,
    onError = () => null,
  }: {
    nodeId: string,
    processId: string,
    uri?: string,
    onMessage?: (data: any) => void, // eslint-disable-line
    onOpen?: (ev: Event) => void,
    onClose?: (ev: CloseEvent) => void,
    onError?: (ev: Event) => void,
    onEncryptionReady?: (api: UqbarEncryptorApi) => void,
  }) {
    this._secret = undefined;
    this.processId = processId;
    this.nodeId = nodeId;
    this._ws = new WebSocket(uri)
    this._ws.onmessage = async (ev: MessageEvent<string | Blob>) => { // eslint-disable-line
      console.log('Received websocket message:', ev.data)
      if (typeof ev.data === 'string') {
        onMessage(ev.data)
      } else if (ev.data instanceof Blob) {
        const bin = await blobToUint8Array(ev.data)
        const string = new TextDecoder().decode(bin);
        onMessage(string)
      }
    }
    this._ws.onopen = (ev: Event) => {
      // Register this API instance with the server
      console.log(`${nodeId}`, getCookie(`uqbar-auth_${nodeId}`), getCookie(`uqbar-ws-auth_${nodeId}`))
      this._ws.send(stringifyAndEncode({
        auth_token: getCookie(`uqbar-auth_${nodeId}`),
        target_process: processId,
        encrypted: false,
      }))

      onOpen(ev)
    }
    this._ws.onclose = onClose
    this._ws.onerror = onError
  }

  send = (data: any) => {
    this._ws.send(stringifyAndEncode(data))
  }
  fetchJson = async <T>(input: RequestInfo | URL, init?: RequestInit | undefined): Promise<T> => {
    console.log('Fetching JSON:', input)
    const response = await fetch(input, init)
    const json: T = await (response.json() as Promise<T>)
    return json
  }
}
