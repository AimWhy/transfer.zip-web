const post = async (endpoint, payload) => {
  const workerHost = process.env.NODE_ENV === "development" ? "localhost" : "worker"
  const res = await (await fetch(`http://${workerHost}:3001${endpoint}`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    }
  })).json()

  if (!res.success) {
    throw res
  }
  else {
    return res
  }
}

const controlPost = async (controlEndpoint, payload) => {
  return await post(`/forward-node-control${controlEndpoint}`, payload)
}

export async function workerSign(payload, expirationTime) {
  return await post("/sign", { payload, expirationTime })
}

export async function workerTransferDelete(nodeUrl, transferId) {
  return await controlPost("/transfer/delete", { nodeUrl, transferId })
}

export async function workerUploadComplete(nodeUrl, transferId, filesList) {
  return await controlPost("/uploadComplete", { nodeUrl, transferId, filesList })
}