
const MadeByHumans = () => {
  return (
    <section id="made-by-humans" className="w-full bg-white py-8 sm:py-12">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="w-full rounded-2xl sm:rounded-3xl overflow-hidden relative animate-on-scroll">
          <div className="bg-gradient-to-r from-purple-900 via-purple-700 to-orange-500 p-8 sm:p-12 min-h-[300px] sm:min-h-[400px] flex flex-col justify-between">
            {/* Header with Nemory branding */}
            <div className="flex items-center text-white">
              <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <span className="text-white text-xl font-semibold font-display">
                Nemory
              </span>
            </div>
            
            {/* Main heading */}
            <div className="flex-1 flex items-center justify-center">
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold text-white text-center italic leading-tight">
                Built For Knowledge Workers
              </h2>
            </div>
            
            {/* Bottom spacer */}
            <div className="h-4"></div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default MadeByHumans;
