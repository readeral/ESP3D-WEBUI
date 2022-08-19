import { h } from "preact"

const PositionPanel = ({targetContext: {positions}, sendCommand, sendZeroCommand, sendHomeCommand, units, setUnits}) => {

    function handleSetUnits(currentUnit) {
        if (currentUnit == 'mm') {
            setUnits('inch')
            sendCommand('G20')
        } else {
            setUnits('mm')
            sendCommand('G21')
        }
    }

    return (
        <div class="position-panel">
            <div class="grid-10">
                <div id="wpos-label">G54</div>
                <button onClick={() => handleSetUnits(units)}>{units}</button>
            </div>

            {/* iterate over every axis key, filter out all wpos keys.
            Seemed the most efficient way to get all represented axes */}
            <div class="axis-container" style={{
                gridTemplateColumns: `repeat(${Object.keys(positions).filter(axiskey => !axiskey.includes('w')).length}, 300px`
            }}>
            {Object.keys(positions).filter(axiskey => !axiskey.includes('w')).map(axis => {
                const workingAxis = "w" + axis
                const labelAxis = axis.toUpperCase();
                return (
                    <div id={`pos-${axis}`} class="axis-box">
                        <div class="axis-label">
                            {labelAxis}
                        </div>
                        <button class="form-input">
                            {positions[workingAxis]}
                        </button>
                        <div>{positions[axis]}</div>
                        <button onClick={() => sendZeroCommand(labelAxis)}>
                            {labelAxis}=0
                        </button>
                        <button onClick={() => sendHomeCommand(labelAxis)}>
                            &rarr;{labelAxis}0
                        </button>
                    </div>
                )
            })}
            </div>
        </div> 
    )
}

export default PositionPanel;
