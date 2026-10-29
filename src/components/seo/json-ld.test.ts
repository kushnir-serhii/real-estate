import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { JsonLd } from "./json-ld";

describe("JsonLd", () => {
  it("escapes < so listing text cannot close the script tag", () => {
    const html = renderToStaticMarkup(createElement(JsonLd, { data: { name: "</script><b>x" } }));
    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html).not.toContain("</script><b>");
    expect(html).toContain("\u003c/script>");
  });
});
