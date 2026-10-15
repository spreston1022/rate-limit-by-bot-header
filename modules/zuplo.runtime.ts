import { OpenTelemetryPlugin } from "@zuplo/otel";
import { environment, RuntimeExtensions } from "@zuplo/runtime";

export function runtimeInit(runtime: RuntimeExtensions) {
  // Trace every request in the working copy, 10% everywhere else.
  // Traces go to Zuplo's built-in storage (portal Observability tab).
  const isWorkingCopy = environment.ZUPLO_ENVIRONMENT_STAGE === "working-copy";
  runtime.addPlugin(
    new OpenTelemetryPlugin({
      sampling: {
        headSampler: { ratio: isWorkingCopy ? 1 : 0.1 },
      },
    }),
  );
}
