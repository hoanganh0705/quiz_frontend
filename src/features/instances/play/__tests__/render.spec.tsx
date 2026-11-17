import { describe, it } from "vitest";
import { render } from "@testing-library/react";
import { InstanceGamePage } from "../pages/InstanceGamePage";
import { InstanceGameView } from "../components/InstanceGameView";

describe("InstanceGamePage debug render", () => {
  it("renders without exploding", () => {
    render(<InstanceGamePage instanceId="01a1e4ac-2d0a-72be-8222-70efc68173ce" />);
  });

  it("renders InstanceGameView without exploding", () => {
    render(<InstanceGameView instanceId="01a1e4ac-2d0a-72be-8222-70efc68173ce" />);
  });
});
