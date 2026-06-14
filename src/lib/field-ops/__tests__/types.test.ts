import { describe, expectTypeOf, it } from "vitest"
import type { CleanupFailure } from "../types"

describe("CleanupFailure.resourceType", () => {
  it("accepts the new VS / model serving / app resource types", () => {
    // Type-level assertions — these compile-check the union
    const vsFailure: CleanupFailure = {
      resourceType: "vector_search_endpoint",
      resourceName: "vs-endpoint-foo",
      errorMessage: "cleanup failed",
    }
    const msFailure: CleanupFailure = {
      resourceType: "model_serving_endpoint",
      resourceName: "ms-endpoint-foo",
      errorMessage: "cleanup failed",
    }
    const appFailure: CleanupFailure = {
      resourceType: "app",
      resourceName: "app-foo",
      errorMessage: "cleanup failed",
    }
    expectTypeOf(vsFailure.resourceType).toEqualTypeOf<
      | "schema"
      | "workspace_dir"
      | "local_bundle"
      | "bundle"
      | "vector_search_endpoint"
      | "model_serving_endpoint"
      | "app"
    >()
    expectTypeOf(msFailure.resourceType).toMatchTypeOf<CleanupFailure["resourceType"]>()
    expectTypeOf(appFailure.resourceType).toMatchTypeOf<CleanupFailure["resourceType"]>()
  })
})