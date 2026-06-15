import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow"

/**
 * Onboarding route. The wizard handles persistence of completion itself; no
 * server-side work is needed here.
 */
export default function OnboardingPage(): React.ReactElement {
  return <OnboardingFlow />
}
