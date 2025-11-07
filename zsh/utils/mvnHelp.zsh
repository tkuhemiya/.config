
mvnH() {

    while getopts "hm:d" flag; do :
        case $flag in 
            h) echo "-m project_name - to create a project" 
                ;;
            d) echo "doing" 
                ;;
            m) 
                filename=$OPTARG
                mvn archetype:generate -DgroupId=app -DartifactId=$filename -DarchetypeArtifactId=maven-archetype-quickstart -DarchetypeVersion=1.5 -DinteractiveMode=false ;
                echo "$filename created!";
                ;;
        esac
    done

}

testHHHH() {
  while getopts "m:d:" flag; do
    echo "Flag: -$flag, OPTARG=$OPTARG, OPTIND=$OPTIND, OPTIND2=${!OPTIND}, ${!((OPTIND + 1))}  w"
  done
}
