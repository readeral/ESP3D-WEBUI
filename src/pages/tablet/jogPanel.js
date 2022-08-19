import { h } from "preact"
import { T } from "../../components/Translations"
import { useState } from "preact/hooks"

const incr = {
    factors: [1, 10, 100, 1000],
    mm: [0.1, 0.3, 0.5],
    inch: [0.001, 0.003, 0.005],
    menu: {
        mm: [0.005, 0.01, 0.03, 0.05, 0.1, 0.3, 0.5, 1, 3, 5, 10, 30, 50, 100, 300, 500, 1000],
        inch: [0.00025, 0.0005, 0.001, 0.003, 0.005, 0.01, 0.03, 0.05, 0.1, 0.3, 0.5, 1, 3, 5, 10, 30]
    }
}

const JogPanel = ({targetContext: {positions}, sendJogCommand, units}) => {
    const [jogDistance, setJogDistance] = useState(0.1);

    function handleJogRequest(axis, dir) {
        switch(dir) {
            case 'pos': 
                sendJogCommand(axis.toUpperCase(), jogDistance);
                break;
            case 'neg':
                sendJogCommand(axis.toUpperCase(), -jogDistance);
                break;
            default: break;
        }
    }

    function handleSelectChange(event) {
        setJogDistance(+event.target.value);
    }

    return (
        <div id="jog-controls" class="jog-panel">
            <div class="jog-grid grid-10">
                <div>G90</div>
                <button onClick={() => handleJogRequest('x', 'neg')}>X-</button>
                <div> </div>
                <button onClick={() => handleJogRequest('y', 'pos')}>Y+</button>
                <div></div>
                <button onClick={() => handleJogRequest('y', 'neg')}>Y-</button>
                <div></div>
                <button onClick={() => handleJogRequest('x', 'pos')}>X+</button>
                <div></div>
                <button onClick={() => handleJogRequest('z', 'pos')}>Z+</button>
                <select value={jogDistance} onChange={handleSelectChange}>
                    {incr.menu[units].map(distance => (
                        <option value={distance}>
                            {distance}
                        </option>
                    ))}
                </select>
                <button onClick={() => handleJogRequest('z', 'neg')}>Z-</button>
            </div>
            <div class="incr-grid grid-10">
                {incr[units].map(button => (
                    incr.factors.map(factor => {
                        const value = button * factor;
                        return <button onClick={() => setJogDistance(value)}>{value}</button>
                    })
                ))}
            </div>
        </div>
    )
}

export default JogPanel;
