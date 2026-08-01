import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PictureScene from "./PictureScene";

describe("PictureScene", () => {
  const props = {
    imageUrl: "https://image.pollinations.ai/prompt/example",
    caption: "A busy coffee shop on a rainy Saturday.",
  };

  it("starts in loading state with a generating-image hint", () => {
    render(<PictureScene {...props} />);
    expect(screen.getByText(/Generating image/i)).toBeInTheDocument();
    expect(screen.getByAltText(props.caption)).toBeInTheDocument();
  });

  it("hides the loader once the image loads and shows a description toggle", () => {
    render(<PictureScene {...props} />);
    fireEvent.load(screen.getByAltText(props.caption));
    expect(screen.queryByText(/Generating image/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Show description/i }),
    ).toBeInTheDocument();
  });

  it("falls back to the caption when the image fails to load", () => {
    render(<PictureScene {...props} />);
    fireEvent.error(screen.getByAltText(props.caption));
    expect(screen.getByText(/Couldn't load the image/i)).toBeInTheDocument();
    expect(screen.getAllByText(props.caption).length).toBeGreaterThanOrEqual(1);
  });

  it("reveals the caption when the user clicks Show description", () => {
    render(<PictureScene {...props} />);
    fireEvent.load(screen.getByAltText(props.caption));
    const toggle = screen.getByRole("button", { name: /Show description/i });
    fireEvent.click(toggle);
    expect(
      screen.getByRole("button", { name: /Hide description/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(props.caption)).toBeInTheDocument();
  });
});
