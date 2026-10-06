import testnet from "./vea/testnet.json";
import type { VeaRoute, VeaRouteFile } from "./types";

// Testnet only: generated from contracts/deployments by `yarn extract:vea`.
const VEA_TESTNET_ROUTES = testnet as Record<string, VeaRouteFile>;

/* --------------------------------------------------
   Internal helper
-------------------------------------------------- */

function getVeaRouteFile(sourceChainId: number, destinationChainId: number): VeaRouteFile | undefined {
  const key = `${sourceChainId}-${destinationChainId}`;
  return Object.hasOwn(VEA_TESTNET_ROUTES, key) ? VEA_TESTNET_ROUTES[key] : undefined;
}

/* --------------------------------------------------
   Public getters – Vea contracts (testnet)
-------------------------------------------------- */

export function getVeaInbox(sourceChainId: number, destinationChainId: number): `0x${string}` | undefined {
  return getVeaRouteFile(sourceChainId, destinationChainId)?.inbox.address;
}

export function getVeaOutbox(sourceChainId: number, destinationChainId: number): `0x${string}` | undefined {
  return getVeaRouteFile(sourceChainId, destinationChainId)?.outbox.address;
}

export function getVeaRouter(sourceChainId: number, destinationChainId: number): `0x${string}` | undefined {
  return getVeaRouteFile(sourceChainId, destinationChainId)?.router?.address;
}

export function getVeaRoute(sourceChainId: number, destinationChainId: number): VeaRoute | undefined {
  const route = getVeaRouteFile(sourceChainId, destinationChainId);
  if (!route) return undefined;

  const result: VeaRoute = { inbox: route.inbox.address, outbox: route.outbox.address };
  if (route.router) result.router = route.router.address;
  return result;
}

export function getVeaRoutes(): string[] {
  return Object.keys(VEA_TESTNET_ROUTES);
}
