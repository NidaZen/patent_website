import React from 'react';
import '../design/Explanation.css';

function Explanation() {
  return (
    <div className="explanation-container">
      <div className="explanation-header">
  <div className="header-title">
    <h2>Unmanned Aerial Vehicle Base Station</h2>
  </div>
</div>
      <div className="explanation-content">
        <p>
          A method and apparatus comprising a platform, a battery system, a power
          generation system, a number of charging stations, and a controller. The platform
          is configured to house a number of unmanned aerial vehicles. The power generation
          system is connected to the battery system. The power generation system is
          configured to generate electrical energy from an environment in which the platform
          is located, and store the electrical energy in the battery system.
        </p>
        <div className="relevancy-score">
          <span>0.97</span>
        </div>
        <div className="patent-codes">
          B64C39/028 | B64C39/024 | B64C2201/066 | B64C2201/201 | B64C2201/042 | B64U80/70 | B64U70/93 | B64U80/25 | B64U50/38 | B64U80/40 | B64U50/19
        </div>
      </div>
    </div>
  );
}

export default Explanation;
