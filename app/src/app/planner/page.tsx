import Redirect from "@/components/shell/Redirect";

/** This screen was removed: it was not part of the study. Old links go to the Overview. */
export default function Removed() {
  return <Redirect to="/" />;
}
