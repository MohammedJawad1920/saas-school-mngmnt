// components/ResultPoster.jsx
"use client";

export default function ResultPoster({
  result,
  posterConfig,
  posterNumber = 1,
}) {
  if (!posterConfig) return null;

  const { backgroundImage, layout, name } = posterConfig;

  // Get winners
  const winners = result?.winners || [];
  const firstPlace = winners.find((w) => w.rank === 1);
  const secondPlace = winners.find((w) => w.rank === 2);
  const thirdPlace = winners.find((w) => w.rank === 3);

  // Render text element with layout config
  const renderElement = (elementKey, content, config) => {
    if (!config?.visible || !content) return null;

    const style = {
      position: "absolute",
      left: `${config.x}%`,
      top: `${config.y}%`,
      transform: "translate(-50%, -50%)",
      color: `#${config.color}`,
      fontSize: `${config.fontSize}px`,
      fontWeight: config.fontWeight || "normal",
      textAlign: config.textAlign || "center",
      lineHeight: config.lineHeight || 1.2,
      whiteSpace: "pre-wrap",
      width: "90%",
      maxWidth: "90%",
      textShadow: config.textShadow ? "2px 2px 4px rgba(0,0,0,0.5)" : "none",
    };

    return (
      <div key={elementKey} style={style}>
        {content}
      </div>
    );
  };

  return (
    <div className="relative w-full aspect-square overflow-hidden rounded-lg shadow-xl">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: backgroundImage?.url
            ? `url("${backgroundImage.url}")`
            : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      />

      {/* Overlay for better text visibility */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Text Elements */}
      <div className="relative w-full h-full">
        {/* Program Info */}
        {renderElement("programInfo", result.programName, layout?.programInfo)}

        {/* Division Info */}
        {renderElement(
          "divisionInfo",
          result.divisionName,
          layout?.divisionInfo
        )}

        {/* Result Number */}
        {renderElement(
          "resultNumber",
          `Result #${String(result.resultNumber).padStart(2, "0")}`,
          layout?.resultNumber
        )}

        {/* First Place */}
        {renderElement(
          "firstPlace",
          firstPlace
            ? `🥇 ${firstPlace.name}${
                layout?.firstPlace?.showTeamName && firstPlace.teamName
                  ? `\n${firstPlace.teamName}`
                  : ""
              }`
            : null,
          layout?.firstPlace
        )}

        {/* Second Place */}
        {renderElement(
          "secondPlace",
          secondPlace
            ? `🥈 ${secondPlace.name}${
                layout?.secondPlace?.showTeamName && secondPlace.teamName
                  ? `\n${secondPlace.teamName}`
                  : ""
              }`
            : null,
          layout?.secondPlace
        )}

        {/* Third Place */}
        {renderElement(
          "thirdPlace",
          thirdPlace
            ? `🥉 ${thirdPlace.name}${
                layout?.thirdPlace?.showTeamName && thirdPlace.teamName
                  ? `\n${thirdPlace.teamName}`
                  : ""
              }`
            : null,
          layout?.thirdPlace
        )}
      </div>

      {/* Poster Label */}
      <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm">
        {name || `Poster ${posterNumber}`}
      </div>
    </div>
  );
}
