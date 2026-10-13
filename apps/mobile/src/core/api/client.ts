import { PicketApiClient } from "@picket/api-client";

import { readPublicConfig } from "@/core/config/public-config";

const config = readPublicConfig();

export const picketApi = config ? new PicketApiClient(config.apiUrl) : null;
