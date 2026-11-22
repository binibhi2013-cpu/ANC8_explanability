import Redirect from "@/components/shell/Redirect";

/** "Models compared" was removed (15 model types on 88 predictors were not part of the
 *  study). Old links go to the study's own Model analysis. */
export default function Removed() {
  return <Redirect to="/models" />;
}
