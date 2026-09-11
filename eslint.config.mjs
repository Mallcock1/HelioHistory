// eslint-config-next v16 ships native flat configs, so no FlatCompat shim is needed
// (wrapping them in FlatCompat throws "Converting circular structure to JSON").
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [...nextVitals, ...nextTs];

export default eslintConfig;
