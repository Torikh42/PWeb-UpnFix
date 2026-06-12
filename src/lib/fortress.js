import net from "net";

/**
 * Memeriksa konektivitas ke Apache Fortress LDAP Server.
 * Menunjukkan integrasi aktif antara Next.js dan container fortress-ldap.
 */
export async function checkFortressConnectivity() {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);

    socket.on("connect", () => {
      console.log("[Fortress Integration] ✓ Successfully connected to Apache Fortress LDAP server on port 389.");
      socket.destroy();
      resolve(true);
    });

    socket.on("timeout", () => {
      console.warn("[Fortress Integration] ✗ Connection to Apache Fortress LDAP server timed out on port 389.");
      socket.destroy();
      resolve(false);
    });

    socket.on("error", (err) => {
      console.warn("[Fortress Integration] ✗ Failed to connect to Apache Fortress LDAP server: " + err.message);
      socket.destroy();
      resolve(false);
    });

    socket.connect(389, "fortress-ldap");
  });
}
