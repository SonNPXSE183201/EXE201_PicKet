import { PicketApiClient } from "@picket/api-client";

import { readPublicConfig } from "@/core/config/public-config";
import { instrumentedFetch } from "@/core/analytics/telemetry";

const config = readPublicConfig();

export const picketApi = config ? new PicketApiClient(config.apiUrl,{fetch:instrumentedFetch}) : null;
