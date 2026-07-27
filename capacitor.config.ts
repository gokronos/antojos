import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.gokronos.antojos",
  appName: "Antojos",
  webDir: "public",
  server: {
    url: "https://antojos.vercel.app/admin",
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
